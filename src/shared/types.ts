/** Shared domain types for VaultLens */

export type ProviderId = 'chrome-builtin' | 'ollama';

export type InferenceLocation =
  'chrome-on-device' | 'ollama-loopback' | 'webgpu-on-device';

export type SummarizeMode = 'quick' | 'bullets' | 'outline';

export type ContextScope = 'page' | 'selection' | 'section';

export type ReadingLevel = 'simple' | 'standard' | 'deep';

export type AnswerLength = 'normal' | 'short';

export type Availability =
  'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unknown';

export type Capability = 'generate' | 'summarize' | 'translate' | 'stream' | 'cancel';

export interface ProviderStatus {
  id: ProviderId;
  displayName: string;
  healthy: boolean;
  availability: Availability;
  errorCode?: ErrorCode;
  model?: string;
  contextWindow?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface SourceBlock {
  sourceBlockId: string;
  text: string;
  tagName: string;
  headingLevel?: number;
  /** CSS selector or DOM path for jump-back */
  locator: string;
  /** Short fingerprint of text for stable id */
  fingerprint: string;
  order: number;
}

export interface ExtractedPage {
  title: string;
  url: string;
  domain: string;
  extractedAt: string;
  contextScope: ContextScope;
  blocks: SourceBlock[];
  plainText: string;
  qualityScore: number;
  wordCount: number;
}

export interface SourceCitation {
  sourceBlockId: string;
  text: string;
  locator: string;
  score: number;
}

export interface PrivacyReceipt {
  taskId: string;
  taskType: 'summarize' | 'ask' | 'translate' | 'health' | 'capability';
  contentSource: 'active-tab' | 'selection' | 'current-section' | 'none';
  providerId: ProviderId;
  model: string;
  inferenceLocation: InferenceLocation;
  savedInput: boolean;
  savedOutput: boolean;
  allowedDestinations: string[];
  pageContentSentToCloud: false;
  createdAt: string;
}

export interface GenerateRequest {
  taskId: string;
  systemPrompt: string;
  userPrompt: string;
  /** Untrusted page/selection content — never treated as instructions */
  untrustedContext?: string;
  maxTokens?: number;
  temperature?: number;
}

export type GenerateEvent =
  | { type: 'start'; taskId: string }
  | { type: 'token'; taskId: string; text: string }
  | { type: 'done'; taskId: string; fullText: string }
  | { type: 'error'; taskId: string; code: ErrorCode; message: string }
  | { type: 'progress'; taskId: string; stage: string; percent?: number };

export interface SummarizeRequest {
  taskId: string;
  mode: SummarizeMode;
  page: ExtractedPage;
  readingLevel: ReadingLevel;
  answerLength: AnswerLength;
  useCache?: boolean;
}

export interface TranslateRequest {
  taskId: string;
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
}

export interface TranslateResult {
  taskId: string;
  translatedText: string;
  detectedLanguage?: string;
  targetLanguage: string;
  engine: 'chrome-translator' | 'llm-fallback';
  providerId: ProviderId;
  model: string;
}

export type ErrorCode =
  | 'PAGE_PROTECTED'
  | 'PAGE_INACCESSIBLE'
  | 'EXTRACT_QUALITY_LOW'
  | 'CONTENT_TOO_LONG'
  | 'CONTENT_INSUFFICIENT'
  | 'MODEL_UNAVAILABLE'
  | 'MODEL_DOWNLOAD_FAILED'
  | 'PROVIDER_UNHEALTHY'
  | 'OLLAMA_UNREACHABLE'
  | 'OLLAMA_CORS'
  | 'TASK_CANCELLED'
  | 'OFFLINE_LOCK_BLOCKED'
  | 'RETRIEVAL_LOW_CONFIDENCE'
  | 'UNKNOWN';

export interface AppError {
  code: ErrorCode;
  message: string;
  cause?: string;
  impact?: string;
  nextSteps?: string[];
}

export interface UserPreferences {
  defaultProviderId: ProviderId;
  ollamaBaseUrl: string;
  ollamaModel: string;
  targetLanguage: string;
  offlineLock: boolean;
  historyEnabled: boolean;
  historyRetentionDays: number;
  onboardingComplete: boolean;
  cacheSummaries: boolean;
  readingLevel: ReadingLevel;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultProviderId: 'chrome-builtin',
  ollamaBaseUrl: 'http://127.0.0.1:11434',
  ollamaModel: '',
  targetLanguage: 'zh-Hans',
  offlineLock: false,
  historyEnabled: false,
  historyRetentionDays: 7,
  onboardingComplete: false,
  cacheSummaries: true,
  readingLevel: 'standard',
};

export const ALLOWED_NETWORK_DESTINATIONS = [
  'chrome-web-store (extension updates)',
  'http://127.0.0.1:11434 (Ollama loopback)',
  'Chrome Built-in AI model/language pack download (user-initiated)',
] as const;

export const OLLAMA_DEFAULT_URL = 'http://127.0.0.1:11434';
