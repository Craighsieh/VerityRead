import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskOrchestrator } from '@/core/orchestrator';
import { providerRegistry } from '@/providers/registry';
import type { LocalAIProvider } from '@/providers/types';
import { getSummaryCache, setSummaryCache } from '@/storage/cache';
import { getPreferences } from '@/storage/preferences';
import {
  DEFAULT_PREFERENCES,
  type Capability,
  type ExtractedPage,
  type GenerateRequest,
  type ProviderStatus,
  type TranslateResult,
} from '@/shared/types';

vi.mock('@/providers/registry', () => ({
  providerRegistry: {
    init: vi.fn(),
    get: vi.fn(),
    getChrome: vi.fn(),
  },
}));

vi.mock('@/storage/preferences', () => ({
  getPreferences: vi.fn(),
}));

vi.mock('@/storage/cache', () => ({
  getSummaryCache: vi.fn(),
  setSummaryCache: vi.fn(),
}));

function makeLongPage(): ExtractedPage {
  const paragraph = 'A factual sentence about the article. '.repeat(180);
  return {
    title: 'Long article',
    url: 'https://example.com/long-article',
    domain: 'example.com',
    extractedAt: new Date().toISOString(),
    contextScope: 'page',
    plainText: `Long article\n\n${paragraph}`,
    qualityScore: 0.9,
    wordCount: paragraph.split(/\s+/).filter(Boolean).length,
    blocks: [
      {
        sourceBlockId: 'heading',
        text: 'Long article',
        tagName: 'h1',
        headingLevel: 1,
        locator: 'article > h1',
        fingerprint: 'heading',
        order: 0,
      },
      {
        sourceBlockId: 'body',
        text: paragraph,
        tagName: 'p',
        locator: 'article > p',
        fingerprint: 'body',
        order: 1,
      },
    ],
  };
}

describe('TaskOrchestrator map-reduce progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPreferences).mockResolvedValue({
      ...DEFAULT_PREFERENCES,
      defaultProviderId: 'ollama',
      ollamaModel: 'gemma4:e4b',
      cacheSummaries: false,
    });
    vi.mocked(getSummaryCache).mockResolvedValue(null);
    vi.mocked(setSummaryCache).mockResolvedValue(undefined);
  });

  it('reports section progress and keeps child requests cancellable by the parent ID', async () => {
    const generateRequests: GenerateRequest[] = [];
    const provider: LocalAIProvider = {
      id: 'ollama',
      displayName: 'Ollama',
      healthCheck: vi.fn(async (): Promise<ProviderStatus> => ({
        id: 'ollama',
        displayName: 'Ollama',
        healthy: true,
        availability: 'available',
        model: 'gemma4:e4b',
        contextWindow: 512,
      })),
      capabilities: vi.fn(async (): Promise<Capability[]> => [
        'generate',
        'summarize',
        'stream',
      ]),
      generate: async function* (request) {
        generateRequests.push(request);
        yield { type: 'start', taskId: request.taskId };
        yield {
          type: 'done',
          taskId: request.taskId,
          fullText: 'A non-empty section summary.',
        };
      },
      summarize: async function* (request) {
        yield { type: 'start', taskId: request.taskId };
        yield {
          type: 'done',
          taskId: request.taskId,
          fullText: 'Final combined summary.',
        };
      },
      cancel: vi.fn(async () => undefined),
      dispose: vi.fn(async () => undefined),
    };
    vi.mocked(providerRegistry.get).mockReturnValue(provider);
    const events: Array<{ stage?: string; percent?: number }> = [];

    const result = await new TaskOrchestrator().summarize(
      'summary-parent',
      makeLongPage(),
      'quick',
      {
        providerId: 'ollama',
        useCache: false,
        onEvent: (event) => events.push(event),
      },
    );

    expect(generateRequests.length).toBeGreaterThan(1);
    expect(generateRequests.every((request) => request.taskId === 'summary-parent')).toBe(
      true,
    );
    expect(events.map((event) => event.stage)).toContain(
      `Summarizing section 1 of ${generateRequests.length}…`,
    );
    expect(events.map((event) => event.stage)).toContain('Combining section summaries…');
    expect(result.text).toBe('Final combined summary.');
  });

  it('surfaces an empty answer as a provider failure', async () => {
    const provider: LocalAIProvider = {
      id: 'ollama',
      displayName: 'Ollama',
      healthCheck: vi.fn(async (): Promise<ProviderStatus> => ({
        id: 'ollama',
        displayName: 'Ollama',
        healthy: true,
        availability: 'available',
        model: 'gemma4:e4b',
        contextWindow: 4096,
      })),
      capabilities: vi.fn(async (): Promise<Capability[]> => ['generate']),
      generate: async function* (request) {
        yield { type: 'done', taskId: request.taskId, fullText: '' };
      },
      cancel: vi.fn(async () => undefined),
      dispose: vi.fn(async () => undefined),
    };
    vi.mocked(providerRegistry.get).mockReturnValue(provider);

    await expect(
      new TaskOrchestrator().ask(
        'empty-answer',
        makeLongPage(),
        'What factual sentence appears in the article?',
        {
          providerId: 'ollama',
          onEvent: () => undefined,
        },
      ),
    ).rejects.toMatchObject({
      code: 'PROVIDER_UNHEALTHY',
      message: 'The local model completed without returning answer text.',
    });
  });

  it('answers directly from selected text and records selection provenance', async () => {
    const generateRequests: GenerateRequest[] = [];
    const provider: LocalAIProvider = {
      id: 'ollama',
      displayName: 'Ollama',
      healthCheck: vi.fn(async (): Promise<ProviderStatus> => ({
        id: 'ollama',
        displayName: 'Ollama',
        healthy: true,
        availability: 'available',
        model: 'gemma4:e4b',
        contextWindow: 4096,
      })),
      capabilities: vi.fn(async (): Promise<Capability[]> => ['generate']),
      generate: async function* (request) {
        generateRequests.push(request);
        yield {
          type: 'done',
          taskId: request.taskId,
          fullText: 'The selected sentence means the policy reduces local risk.',
        };
      },
      cancel: vi.fn(async () => undefined),
      dispose: vi.fn(async () => undefined),
    };
    vi.mocked(providerRegistry.get).mockReturnValue(provider);
    const page: ExtractedPage = {
      ...makeLongPage(),
      contextScope: 'selection',
      plainText: 'This policy reduces local risk.',
      wordCount: 5,
      qualityScore: 0.1,
      blocks: [
        {
          sourceBlockId: 'selected',
          text: 'This policy reduces local risk.',
          tagName: 'p',
          locator: 'article > p',
          fingerprint: 'selected',
          order: 0,
        },
      ],
    };

    const result = await new TaskOrchestrator().ask(
      'selected-answer',
      page,
      'Explain this sentence.',
      {
        providerId: 'ollama',
        readingLevel: 'simple',
        answerLength: 'short',
        onEvent: () => undefined,
      },
    );

    expect(generateRequests[0]).toMatchObject({
      untrustedContext: 'This policy reduces local risk.',
      maxTokens: 240,
    });
    expect(generateRequests[0]?.systemPrompt).toContain('plain language');
    expect(result.receipt.contentSource).toBe('selection');
    expect(result.citations).toHaveLength(1);
  });

  it('surfaces an empty translation as a provider failure', async () => {
    const provider: LocalAIProvider = {
      id: 'ollama',
      displayName: 'Ollama',
      healthCheck: vi.fn(async (): Promise<ProviderStatus> => ({
        id: 'ollama',
        displayName: 'Ollama',
        healthy: true,
        availability: 'available',
        model: 'gemma4:e4b',
      })),
      capabilities: vi.fn(async (): Promise<Capability[]> => ['translate']),
      generate: async function* () {
        return;
      },
      translate: vi.fn(async (request): Promise<TranslateResult> => ({
        taskId: request.taskId,
        translatedText: '   ',
        targetLanguage: request.targetLanguage,
        engine: 'llm-fallback',
        providerId: 'ollama',
        model: 'gemma4:e4b',
      })),
      cancel: vi.fn(async () => undefined),
      dispose: vi.fn(async () => undefined),
    };
    vi.mocked(providerRegistry.get).mockReturnValue(provider);
    vi.mocked(providerRegistry.getChrome).mockReturnValue({
      translateWithTranslator: vi.fn(async () => null),
    } as never);

    await expect(
      new TaskOrchestrator().translate('empty-translation', 'Hello.', 'zh-Hant', {
        providerId: 'ollama',
      }),
    ).rejects.toMatchObject({
      code: 'PROVIDER_UNHEALTHY',
      message: 'The local model completed without returning translated text.',
    });
  });

  it('prefers Chrome Translator before the selected provider LLM', async () => {
    const ollamaTranslate = vi.fn();
    const provider = {
      id: 'ollama',
      displayName: 'Ollama',
      translate: ollamaTranslate,
    } as unknown as LocalAIProvider;
    vi.mocked(providerRegistry.get).mockReturnValue(provider);
    vi.mocked(providerRegistry.getChrome).mockReturnValue({
      translateWithTranslator: vi.fn(async (request) => ({
        taskId: request.taskId,
        translatedText: 'こんにちは',
        detectedLanguage: 'en',
        targetLanguage: request.targetLanguage,
        engine: 'chrome-translator',
        providerId: 'chrome-builtin',
        model: 'Chrome Translator',
      })),
    } as never);

    const translated = await new TaskOrchestrator().translate(
      'chrome-first',
      'Hello',
      'ja',
      { providerId: 'ollama' },
    );

    expect(translated.result.engine).toBe('chrome-translator');
    expect(translated.receipt.inferenceLocation).toBe('chrome-on-device');
    expect(ollamaTranslate).not.toHaveBeenCalled();
  });
});
