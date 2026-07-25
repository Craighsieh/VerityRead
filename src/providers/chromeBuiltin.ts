import { createAppError } from '@/shared/errors';
import { wrapUntrustedContext } from '@/shared/sanitize';
import type {
  Availability,
  Capability,
  ErrorCode,
  GenerateEvent,
  GenerateRequest,
  ProviderStatus,
  SummarizeRequest,
  TranslateRequest,
  TranslateResult,
} from '@/shared/types';
import { isAppError } from '@/shared/errors';
import type {
  ChromeLanguageModelSession,
  ChromeLanguageModelStatic,
  ChromeLanguageDetectorStatic,
  ChromeSummarizerStatic,
  ChromeTranslatorStatic,
  LocalAIProvider,
} from './types';
import { t } from '@/i18n';

function normalizeAvailability(value: unknown): Availability {
  if (
    value === 'available' ||
    value === 'downloadable' ||
    value === 'downloading' ||
    value === 'unavailable'
  ) {
    return value;
  }
  // Older API used "readily" / "after-download"
  if (value === 'readily') return 'available';
  if (value === 'after-download') return 'downloadable';
  return 'unknown';
}

function getLanguageModelApi(): ChromeLanguageModelStatic | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.LanguageModel ?? window.ai?.languageModel;
}

function getSummarizerApi(): ChromeSummarizerStatic | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.Summarizer ?? window.ai?.summarizer;
}

function getTranslatorApi(): ChromeTranslatorStatic | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.Translator ?? window.ai?.translator;
}

function getLanguageDetectorApi(): ChromeLanguageDetectorStatic | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.LanguageDetector ?? window.ai?.languageDetector;
}

function translatorLanguageCode(language: string): string {
  const normalized = language.trim();
  const lower = normalized.toLowerCase();
  if (lower === 'zh-hant' || lower === 'zh-tw' || lower === 'zh-hk') return 'zh-Hant';
  if (lower === 'zh-hans' || lower === 'zh-cn' || lower === 'zh-sg') return 'zh';
  return lower.split('-')[0] ?? normalized;
}

async function detectWithChromeI18n(text: string): Promise<string | undefined> {
  if (typeof chrome === 'undefined' || !chrome.i18n?.detectLanguage) return undefined;
  try {
    const result = await chrome.i18n.detectLanguage(text);
    const best = result.languages
      .filter((language) => language.language !== 'und')
      .sort((a, b) => b.percentage - a.percentage)[0];
    return best && best.percentage >= 20 ? best.language : undefined;
  } catch {
    return undefined;
  }
}

async function detectSourceLanguage(text: string): Promise<string | undefined> {
  const detectorApi = getLanguageDetectorApi();
  if (detectorApi) {
    let detector: Awaited<ReturnType<ChromeLanguageDetectorStatic['create']>> | null =
      null;
    try {
      const availability = normalizeAvailability(await detectorApi.availability());
      if (availability !== 'unavailable') {
        detector = await detectorApi.create();
        const [best] = await detector.detect(text);
        if (best && best.confidence >= 0.2 && best.detectedLanguage !== 'und') {
          return best.detectedLanguage;
        }
      }
    } catch {
      // Fall back to the extension i18n detector below.
    } finally {
      detector?.destroy();
    }
  }
  return detectWithChromeI18n(text);
}

export async function probeChromeAvailability(): Promise<{
  languageModel: Availability;
  summarizer: Availability;
  translator: Availability;
  webgpu: boolean;
}> {
  const lm = getLanguageModelApi();
  const sm = getSummarizerApi();
  const tr = getTranslatorApi();

  const [languageModel, summarizer, translator] = await Promise.all([
    lm
      ?.availability?.()
      .then(normalizeAvailability)
      .catch(() => 'unavailable' as Availability) ??
      Promise.resolve('unavailable' as Availability),
    sm
      ?.availability?.()
      .then(normalizeAvailability)
      .catch(() => 'unavailable' as Availability) ??
      Promise.resolve('unavailable' as Availability),
    // Translator needs language pair; probe with en→zh as default
    tr
      ?.availability?.({ sourceLanguage: 'en', targetLanguage: 'zh-Hans' })
      .then(normalizeAvailability)
      .catch(() => 'unavailable' as Availability) ??
      Promise.resolve('unavailable' as Availability),
  ]);

  const webgpu =
    typeof navigator !== 'undefined' &&
    'gpu' in navigator &&
    typeof (navigator as Navigator & { gpu?: unknown }).gpu !== 'undefined';

  return { languageModel, summarizer, translator, webgpu };
}

export class ChromeBuiltinAIProvider implements LocalAIProvider {
  readonly id = 'chrome-builtin' as const;
  readonly displayName = 'Chrome Built-in AI';

  private sessions = new Map<string, ChromeLanguageModelSession>();
  private abortControllers = new Map<string, AbortController>();

  async healthCheck(): Promise<ProviderStatus> {
    const avail = await probeChromeAvailability();
    const best = avail.languageModel;
    return {
      id: this.id,
      displayName: this.displayName,
      healthy: best === 'available' || best === 'downloadable' || best === 'downloading',
      availability: best,
      model: 'Gemini Nano (Built-in)',
      message:
        best === 'unavailable'
          ? createAppError('MODEL_UNAVAILABLE').message
          : undefined,
      details: avail,
    };
  }

  async capabilities(): Promise<Capability[]> {
    const avail = await probeChromeAvailability();
    const caps: Capability[] = [];
    if (avail.languageModel !== 'unavailable') {
      caps.push('generate', 'stream', 'cancel');
    }
    if (avail.summarizer !== 'unavailable') {
      caps.push('summarize');
    }
    if (avail.translator !== 'unavailable') {
      caps.push('translate');
    }
    return caps;
  }

  private async ensureSession(
    taskId: string,
    onProgress?: (percent: number) => void,
  ): Promise<ChromeLanguageModelSession> {
    const existing = this.sessions.get(taskId);
    if (existing) return existing;

    const api = getLanguageModelApi();
    if (!api) {
      throw createAppError('MODEL_UNAVAILABLE', {
        cause: 'LanguageModel API missing in this context',
      });
    }

    const availability = normalizeAvailability(await api.availability());
    if (availability === 'unavailable') {
      throw createAppError('MODEL_UNAVAILABLE');
    }

    const controller = new AbortController();
    this.abortControllers.set(taskId, controller);

    try {
      const session = await api.create({
        signal: controller.signal,
        monitor: (m) => {
          m.addEventListener('downloadprogress', (e) => {
            if (e.total && e.loaded != null) {
              onProgress?.(Math.round((e.loaded / e.total) * 100));
            }
          });
        },
      });
      this.sessions.set(taskId, session);
      return session;
    } catch (err) {
      throw createAppError('MODEL_DOWNLOAD_FAILED', {
        cause: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async *generate(request: GenerateRequest): AsyncIterable<GenerateEvent> {
    const { taskId } = request;
    yield { type: 'start', taskId };
    yield {
      type: 'progress',
      taskId,
      stage: t('loadingChromeModel'),
      percent: 50,
    };

    try {
      const session = await this.ensureSession(taskId, (percent) => {
        // progress events emitted via separate channel if needed
        void percent;
      });

      const prompt = [
        request.systemPrompt,
        request.untrustedContext
          ? wrapUntrustedContext('page', request.untrustedContext)
          : '',
        request.userPrompt,
      ]
        .filter(Boolean)
        .join('\n\n');
      yield {
        type: 'progress',
        taskId,
        stage: t('chromeModelReady'),
        percent: 65,
      };

      let full = '';
      if (session.promptStreaming) {
        const stream = session.promptStreaming(prompt);
        for await (const chunk of stream) {
          if (this.abortControllers.get(taskId)?.signal.aborted) {
            yield {
              type: 'error',
              taskId,
              code: 'TASK_CANCELLED',
              message: createAppError('TASK_CANCELLED').message,
            };
            return;
          }
          const text = typeof chunk === 'string' ? chunk : String(chunk);
          // Some implementations send cumulative text
          const delta = text.startsWith(full) ? text.slice(full.length) : text;
          full = text.startsWith(full) ? text : full + text;
          if (delta) {
            yield { type: 'token', taskId, text: delta };
          }
        }
      } else {
        full = await session.prompt(prompt);
        yield { type: 'token', taskId, text: full };
      }

      yield { type: 'done', taskId, fullText: full };
    } catch (err) {
      const code: ErrorCode = isAppError(err) ? err.code : 'MODEL_UNAVAILABLE';
      yield {
        type: 'error',
        taskId,
        code,
        message: isAppError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err),
      };
    } finally {
      await this.releaseSession(taskId);
    }
  }

  async *summarize(request: SummarizeRequest): AsyncIterable<GenerateEvent> {
    const { taskId, mode, page } = request;
    const summarizerApi = getSummarizerApi();

    const lengthMap = {
      quick: 'short',
      bullets: 'medium',
      outline: 'long',
    } as const;

    const systemPrompt = [
      'You are VerityRead, a privacy-first page assistant.',
      'Summarize ONLY from the provided page content.',
      'Do not add external knowledge. If content is insufficient, say so.',
      mode === 'quick'
        ? 'Output 3-5 concise sentences.'
        : mode === 'bullets'
          ? 'Output 5-10 short bullet points.'
          : 'Output a hierarchical outline following the page structure.',
      request.readingLevel === 'simple'
        ? 'Use plain language, short sentences, and explain uncommon terms.'
        : request.readingLevel === 'deep'
          ? 'Preserve nuance, caveats, important terminology, and relationships.'
          : 'Use clear language for an informed general reader.',
      request.answerLength === 'short'
        ? 'Return the shortest useful version.'
        : 'Keep the response focused.',
    ].join(' ');

    if (
      summarizerApi &&
      mode !== 'outline' &&
      request.readingLevel === 'standard' &&
      request.answerLength === 'normal'
    ) {
      yield { type: 'start', taskId };
      yield {
        type: 'progress',
        taskId,
        stage: t('loadingChromeSummarizer'),
        percent: 50,
      };
      try {
        const availability = normalizeAvailability(await summarizerApi.availability());
        if (availability === 'unavailable') {
          // fall through to generate
        } else {
          const controller = new AbortController();
          this.abortControllers.set(taskId, controller);
          const session = await summarizerApi.create({
            type: 'key-points',
            format: mode === 'bullets' ? 'plain-text' : 'plain-text',
            length: lengthMap[mode],
            signal: controller.signal,
          });
          const input = page.plainText.slice(0, 12000);
          yield {
            type: 'progress',
            taskId,
            stage: t('chromeSummarizerReady'),
            percent: 65,
          };
          let full = '';
          if (session.summarizeStreaming) {
            for await (const chunk of session.summarizeStreaming(input)) {
              const text = String(chunk);
              const delta = text.startsWith(full) ? text.slice(full.length) : text;
              full = text.startsWith(full) ? text : full + text;
              if (delta) yield { type: 'token', taskId, text: delta };
            }
          } else {
            full = await session.summarize(input);
            yield { type: 'token', taskId, text: full };
          }
          session.destroy();
          yield { type: 'done', taskId, fullText: full };
          return;
        }
      } catch {
        // fall through to LanguageModel
      }
    }

    yield* this.generate({
      taskId,
      systemPrompt,
      userPrompt: `Summarize this page titled "${page.title}".`,
      untrustedContext: page.plainText,
      maxTokens: request.answerLength === 'short' ? 260 : undefined,
    });
  }

  async translate(request: TranslateRequest): Promise<TranslateResult> {
    const dedicated = await this.translateWithTranslator(request);
    if (dedicated) return dedicated;

    const sourceLanguage = request.sourceLanguage
      ? translatorLanguageCode(request.sourceLanguage)
      : undefined;
    const targetLanguage = translatorLanguageCode(request.targetLanguage);

    // LLM fallback
    let full = '';
    for await (const event of this.generate({
      taskId: request.taskId,
      systemPrompt:
        'Translate the user text. Preserve line boundaries. Output only the translation, no commentary.',
      userPrompt: `Translate to ${targetLanguage}:\n${request.text}`,
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
      detectedLanguage: sourceLanguage,
      targetLanguage: request.targetLanguage,
      engine: 'llm-fallback',
      providerId: this.id,
      model: 'Gemini Nano (Built-in)',
    };
  }

  /**
   * Uses Chrome's task-specific, on-device Translator before any provider LLM.
   * Returns null when the language pair cannot be detected or is unavailable.
   */
  async translateWithTranslator(
    request: TranslateRequest,
  ): Promise<TranslateResult | null> {
    const api = getTranslatorApi();
    if (!api) return null;

    const detectedLanguage =
      request.sourceLanguage ?? (await detectSourceLanguage(request.text));
    if (!detectedLanguage) return null;

    const sourceLanguage = translatorLanguageCode(detectedLanguage);
    const targetLanguage = translatorLanguageCode(request.targetLanguage);
    if (sourceLanguage === targetLanguage) {
      return {
        taskId: request.taskId,
        translatedText: request.text,
        detectedLanguage,
        targetLanguage: request.targetLanguage,
        engine: 'identity',
        providerId: this.id,
        model: 'No translation needed',
      };
    }

    let session: Awaited<ReturnType<ChromeTranslatorStatic['create']>> | null = null;
    try {
      const availability = normalizeAvailability(
        await api.availability({ sourceLanguage, targetLanguage }),
      );
      if (availability === 'unavailable') return null;

      const controller = new AbortController();
      this.abortControllers.set(request.taskId, controller);
      session = await api.create({
        sourceLanguage,
        targetLanguage,
        signal: controller.signal,
      });
      return {
        taskId: request.taskId,
        translatedText: await session.translate(request.text),
        detectedLanguage,
        targetLanguage: request.targetLanguage,
        engine: 'chrome-translator',
        providerId: this.id,
        model: 'Chrome Translator',
      };
    } catch {
      return null;
    } finally {
      try {
        session?.destroy();
      } finally {
        this.abortControllers.delete(request.taskId);
      }
    }
  }

  async cancel(taskId: string): Promise<void> {
    this.abortControllers.get(taskId)?.abort();
    this.abortControllers.delete(taskId);
    await this.releaseSession(taskId);
  }

  private async releaseSession(taskId: string): Promise<void> {
    const session = this.sessions.get(taskId);
    if (session) {
      try {
        session.destroy();
      } catch {
        // ignore
      }
      this.sessions.delete(taskId);
    }
    this.abortControllers.delete(taskId);
  }

  async dispose(): Promise<void> {
    for (const taskId of [...this.sessions.keys()]) {
      await this.releaseSession(taskId);
    }
  }
}
