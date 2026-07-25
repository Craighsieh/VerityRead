import type {
  Availability,
  Capability,
  GenerateEvent,
  GenerateRequest,
  ProviderId,
  ProviderStatus,
  SummarizeRequest,
  TranslateRequest,
  TranslateResult,
} from '@/shared/types';

export interface LocalAIProvider {
  id: ProviderId;
  displayName: string;
  healthCheck(): Promise<ProviderStatus>;
  capabilities(): Promise<Capability[]>;
  generate(request: GenerateRequest): AsyncIterable<GenerateEvent>;
  translate?(request: TranslateRequest): Promise<TranslateResult>;
  summarize?(request: SummarizeRequest): AsyncIterable<GenerateEvent>;
  cancel(taskId: string): Promise<void>;
  dispose(): Promise<void>;
}

export interface ChromeAiAvailability {
  languageModel: Availability;
  summarizer: Availability;
  translator: Availability;
}

/** Minimal typings for Chrome Built-in AI (Prompt API / Summarizer / Translator). */
export interface ChromeLanguageModelSession {
  prompt(input: string): Promise<string>;
  promptStreaming(input: string): AsyncIterable<string>;
  destroy(): void;
  inputUsage?: number;
  inputQuota?: number;
}

export interface ChromeLanguageModelStatic {
  availability(): Promise<Availability | string>;
  create(options?: {
    monitor?: (m: { addEventListener: (type: string, cb: (e: { loaded?: number; total?: number }) => void) => void }) => void;
    signal?: AbortSignal;
  }): Promise<ChromeLanguageModelSession>;
}

export interface ChromeSummarizerSession {
  summarize(input: string): Promise<string>;
  summarizeStreaming(input: string): AsyncIterable<string>;
  destroy(): void;
}

export interface ChromeSummarizerStatic {
  availability(): Promise<Availability | string>;
  create(options?: {
    type?: string;
    format?: string;
    length?: string;
    monitor?: (m: { addEventListener: (type: string, cb: (e: { loaded?: number; total?: number }) => void) => void }) => void;
    signal?: AbortSignal;
  }): Promise<ChromeSummarizerSession>;
}

export interface ChromeTranslatorSession {
  translate(input: string): Promise<string>;
  destroy(): void;
}

export interface ChromeTranslatorStatic {
  availability(options: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<Availability | string>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (m: { addEventListener: (type: string, cb: (e: { loaded?: number; total?: number }) => void) => void }) => void;
    signal?: AbortSignal;
  }): Promise<ChromeTranslatorSession>;
}

declare global {
  interface Window {
    LanguageModel?: ChromeLanguageModelStatic;
    Summarizer?: ChromeSummarizerStatic;
    Translator?: ChromeTranslatorStatic;
    ai?: {
      languageModel?: ChromeLanguageModelStatic;
      summarizer?: ChromeSummarizerStatic;
      translator?: ChromeTranslatorStatic;
    };
  }
}

export {};
