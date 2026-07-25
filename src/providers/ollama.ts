import { createAppError } from '@/shared/errors';
import { wrapUntrustedContext } from '@/shared/sanitize';
import { guardedFetch } from '@/core/offlineLock';
import {
  OLLAMA_DEFAULT_URL,
  type Capability,
  type ErrorCode,
  type GenerateEvent,
  type GenerateRequest,
  type ProviderStatus,
  type SummarizeRequest,
  type TranslateRequest,
  type TranslateResult,
} from '@/shared/types';
import type { LocalAIProvider } from './types';
import { t } from '@/i18n';

export interface OllamaModelInfo {
  name: string;
  size?: number;
  details?: { parameter_size?: string; family?: string };
}

const OLLAMA_CONTEXT_WINDOW_CAP = 32_768;

function modelContextWindow(modelInfo: Record<string, unknown>): number | undefined {
  const architecture = modelInfo['general.architecture'];
  if (typeof architecture === 'string') {
    const architectureContext = modelInfo[`${architecture}.context_length`];
    if (typeof architectureContext === 'number' && architectureContext > 0) {
      return architectureContext;
    }
  }

  const candidates = Object.entries(modelInfo)
    .filter(
      ([key, value]) => key.endsWith('.context_length') && typeof value === 'number',
    )
    .map(([, value]) => value as number)
    .filter((value) => value > 0);
  return candidates.length > 0 ? Math.max(...candidates) : undefined;
}

function assertLoopbackUrl(baseUrl: string): string {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw createAppError('OLLAMA_UNREACHABLE', {
      cause: 'Invalid Ollama URL',
    });
  }
  if (
    url.origin !== OLLAMA_DEFAULT_URL ||
    url.username ||
    url.password ||
    (url.pathname !== '/' && url.pathname !== '') ||
    url.search ||
    url.hash
  ) {
    throw createAppError('OLLAMA_UNREACHABLE', {
      cause: `Version 0.1.0 only allows ${OLLAMA_DEFAULT_URL}`,
      message: `Custom Ollama endpoints are unavailable in this release. Use ${OLLAMA_DEFAULT_URL}.`,
    });
  }
  return OLLAMA_DEFAULT_URL;
}

function detectCorsError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('CORS') ||
    msg.includes('TypeError')
  );
}

async function readOllamaError(response: Response): Promise<string | undefined> {
  try {
    const data = (await response.json()) as { error?: unknown };
    return typeof data.error === 'string' ? data.error : undefined;
  } catch {
    return undefined;
  }
}

function errorCodeForHttpStatus(status: number): ErrorCode {
  if (status === 403) return 'OLLAMA_CORS';
  if (status === 404) return 'MODEL_UNAVAILABLE';
  return 'PROVIDER_UNHEALTHY';
}

/**
 * Browser fetch intentionally hides CORS response details. A no-cors request
 * with no user content distinguishes a reachable Ollama server from a stopped
 * server without broadening the loopback-only network boundary.
 */
async function classifyFetchFailure(
  baseUrl: string,
  err: unknown,
): Promise<'OLLAMA_CORS' | 'OLLAMA_UNREACHABLE'> {
  if (!detectCorsError(err)) return 'OLLAMA_UNREACHABLE';
  try {
    await guardedFetch(`${baseUrl}/api/version`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
    });
    return 'OLLAMA_CORS';
  } catch {
    return 'OLLAMA_UNREACHABLE';
  }
}

export const OLLAMA_CORS_GUIDE = {
  macos: [
    'Quit Ollama from the menu bar.',
    'In Terminal, run:',
    '  launchctl setenv OLLAMA_ORIGINS "chrome-extension://YOUR_EXTENSION_ID"',
    'Restart Ollama, then click Connection Test.',
    'Replace YOUR_EXTENSION_ID with the ID shown in chrome://extensions.',
  ],
  windows: [
    'Quit Ollama from the system tray.',
    'Set a User environment variable:',
    '  Name: OLLAMA_ORIGINS',
    '  Value: chrome-extension://YOUR_EXTENSION_ID',
    'Restart Ollama from the Start menu, then click Connection Test.',
  ],
  linux: [
    'Stop the Ollama service.',
    'Export before starting:',
    '  export OLLAMA_ORIGINS="chrome-extension://YOUR_EXTENSION_ID"',
    '  ollama serve',
    'Or set the variable in your systemd unit Environment= line.',
  ],
} as const;

export class OllamaProvider implements LocalAIProvider {
  readonly id = 'ollama' as const;
  readonly displayName = 'Ollama (local)';

  private baseUrl: string;
  private model: string;
  private abortControllers = new Map<string, AbortController>();
  private contextWindows = new Map<string, number>();

  constructor(options?: { baseUrl?: string; model?: string }) {
    this.baseUrl = assertLoopbackUrl(options?.baseUrl ?? OLLAMA_DEFAULT_URL);
    this.model = options?.model ?? '';
  }

  setModel(model: string): void {
    this.model = model;
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = assertLoopbackUrl(baseUrl);
    this.contextWindows.clear();
  }

  private async resolveContextWindow(model: string): Promise<number | undefined> {
    const cached = this.contextWindows.get(model);
    if (cached) return cached;

    try {
      // /api/show contains model metadata only; no page content is sent.
      const response = await guardedFetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      if (!response.ok) return undefined;
      const data = (await response.json()) as {
        model_info?: Record<string, unknown>;
      };
      const modelMaximum = data.model_info
        ? modelContextWindow(data.model_info)
        : undefined;
      if (!modelMaximum) return undefined;

      // Ollama commonly runs local models below their advertised maximum.
      // This cap avoids excessive KV-cache memory while eliminating the old
      // 4K fallback that caused unnecessary map-reduce work.
      const effectiveContext = Math.min(modelMaximum, OLLAMA_CONTEXT_WINDOW_CAP);
      this.contextWindows.set(model, effectiveContext);
      return effectiveContext;
    } catch {
      return undefined;
    }
  }

  async healthCheck(): Promise<ProviderStatus> {
    try {
      // Never include page content in health checks
      const res = await guardedFetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        const errorCode = errorCodeForHttpStatus(res.status);
        const detail = await readOllamaError(res);
        return {
          id: this.id,
          displayName: this.displayName,
          healthy: false,
          availability: 'unavailable',
          errorCode,
          message: detail
            ? `${t('ollamaHttpError', { status: res.status })} ${detail}`
            : t('ollamaHttpError', { status: res.status }),
        };
      }
      const data = (await res.json()) as { models?: OllamaModelInfo[] };
      const models = data.models ?? [];
      const configuredModel = this.model.trim();
      const selected = configuredModel || models[0]?.name || '';
      const selectedInstalled =
        !configuredModel || models.some((model) => model.name === configuredModel);
      const healthy = models.length > 0 && selectedInstalled;
      const errorCode = healthy ? undefined : 'MODEL_UNAVAILABLE';
      const contextWindow =
        healthy && selected ? await this.resolveContextWindow(selected) : undefined;
      return {
        id: this.id,
        displayName: this.displayName,
        healthy,
        availability:
          models.length === 0
            ? 'downloadable'
            : selectedInstalled
              ? 'available'
              : 'unavailable',
        errorCode,
        model: selected || undefined,
        contextWindow,
        message:
          models.length === 0
            ? t('ollamaNoModels')
            : !selectedInstalled
              ? t('ollamaModelNotInstalled', { model: configuredModel })
              : undefined,
        details: {
          models: models.map((m) => m.name),
          modelInfo: models.map((model) => ({
            name: model.name,
            size: model.size,
            parameterSize: model.details?.parameter_size,
            family: model.details?.family,
          })),
          baseUrl: this.baseUrl,
        },
      };
    } catch (err) {
      const errorCode = await classifyFetchFailure(this.baseUrl, err);
      const appError = createAppError(errorCode);
      return {
        id: this.id,
        displayName: this.displayName,
        healthy: false,
        availability: 'unavailable',
        errorCode,
        message: appError.message,
        details: { cause: String(err) },
      };
    }
  }

  async capabilities(): Promise<Capability[]> {
    const status = await this.healthCheck();
    if (!status.healthy) return [];
    return ['generate', 'summarize', 'translate', 'stream', 'cancel'];
  }

  private async resolveModel(): Promise<string> {
    if (this.model) return this.model;
    const status = await this.healthCheck();
    if (!status.model) {
      throw createAppError('MODEL_UNAVAILABLE', {
        cause: 'No Ollama model selected or installed',
      });
    }
    this.model = status.model;
    return this.model;
  }

  async *generate(request: GenerateRequest): AsyncIterable<GenerateEvent> {
    const { taskId } = request;
    yield { type: 'start', taskId };

    const controller = new AbortController();
    this.abortControllers.set(taskId, controller);

    try {
      const model = await this.resolveModel();
      yield {
        type: 'progress',
        taskId,
        stage: t('loadingOllamaModel', { model }),
        percent: 50,
      };
      const system = [
        request.systemPrompt,
        request.untrustedContext
          ? wrapUntrustedContext('page', request.untrustedContext)
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const res = await guardedFetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          stream: true,
          // VerityRead renders final answer tokens only, so hidden reasoning would
          // delay visible output and can leave the UI looking indefinitely blank.
          think: false,
          keep_alive: '10m',
          options: request.maxTokens
            ? {
                num_predict: request.maxTokens,
              }
            : undefined,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: request.userPrompt },
          ],
        }),
      });

      if (!res.ok || !res.body) {
        const errorCode = errorCodeForHttpStatus(res.status);
        const detail = await readOllamaError(res);
        const appError = createAppError(errorCode);
        yield {
          type: 'error',
          taskId,
          code: errorCode,
          message: detail
            ? `${appError.message} ${detail}`
            : `Ollama chat failed: HTTP ${res.status}`,
        };
        return;
      }

      yield {
        type: 'progress',
        taskId,
        stage: t('ollamaFirstToken', { model }),
        percent: 65,
      };
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line) as {
              message?: { content?: string };
              done?: boolean;
            };
            const token = json.message?.content ?? '';
            if (token) {
              full += token;
              yield { type: 'token', taskId, text: token };
            }
          } catch {
            // ignore malformed NDJSON line
          }
        }
      }

      yield { type: 'done', taskId, fullText: full };
    } catch (err) {
      if (controller.signal.aborted) {
        yield {
          type: 'error',
          taskId,
          code: 'TASK_CANCELLED',
          message: createAppError('TASK_CANCELLED').message,
        };
        return;
      }
      const errorCode = await classifyFetchFailure(this.baseUrl, err);
      yield {
        type: 'error',
        taskId,
        code: errorCode,
        message: createAppError(errorCode).message,
      };
    } finally {
      this.abortControllers.delete(taskId);
    }
  }

  async *summarize(request: SummarizeRequest): AsyncIterable<GenerateEvent> {
    const modeHint =
      request.mode === 'quick'
        ? 'Write 3-5 concise sentences.'
        : request.mode === 'bullets'
          ? 'Write 5-10 short bullet points.'
          : 'Write a hierarchical outline following the page structure.';
    const readingLevelHint =
      request.readingLevel === 'simple'
        ? 'Use plain language, short sentences, and explain uncommon terms.'
        : request.readingLevel === 'deep'
          ? 'Preserve nuance, caveats, important terminology, and relationships.'
          : 'Use clear language for an informed general reader.';
    const answerLengthHint =
      request.answerLength === 'short'
        ? 'Return the shortest useful version.'
        : 'Keep the response focused.';

    yield* this.generate({
      taskId: request.taskId,
      systemPrompt: [
        'You are VerityRead. Summarize ONLY from the provided page content.',
        'Do not add external knowledge.',
        modeHint,
        readingLevelHint,
        answerLengthHint,
      ].join(' '),
      userPrompt: `Summarize the page titled "${request.page.title}".`,
      untrustedContext: request.page.plainText,
      maxTokens: request.answerLength === 'short' ? 260 : undefined,
    });
  }

  async translate(request: TranslateRequest): Promise<TranslateResult> {
    let full = '';
    for await (const event of this.generate({
      taskId: request.taskId,
      systemPrompt:
        'Translate the user text. Preserve line boundaries. Output only the translation, no commentary.',
      userPrompt: `Translate to ${request.targetLanguage}:\n${request.text}`,
    })) {
      if (event.type === 'token') full += event.text;
      if (event.type === 'done') full = event.fullText;
      if (event.type === 'error') {
        throw createAppError(event.code, { message: event.message });
      }
    }
    return {
      taskId: request.taskId,
      translatedText: full,
      detectedLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      engine: 'llm-fallback',
      providerId: this.id,
      model: this.model || 'ollama',
    };
  }

  async cancel(taskId: string): Promise<void> {
    this.abortControllers.get(taskId)?.abort();
    this.abortControllers.delete(taskId);
  }

  async dispose(): Promise<void> {
    for (const taskId of [...this.abortControllers.keys()]) {
      await this.cancel(taskId);
    }
  }
}
