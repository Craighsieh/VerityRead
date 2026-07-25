import type { AppError, ErrorCode } from './types';

const ERROR_CATALOG: Record<
  ErrorCode,
  { message: string; impact: string; nextSteps: string[] }
> = {
  PAGE_PROTECTED: {
    message: 'This page cannot be accessed by extensions.',
    impact: 'VaultLens cannot read chrome://, Web Store, or browser settings pages.',
    nextSteps: [
      'Open a normal http(s) page such as an article or GitHub issue.',
      'Or select text and use Translate instead of full-page extract.',
    ],
  },
  PAGE_INACCESSIBLE: {
    message: 'Unable to access the current tab content.',
    impact: 'Summary and Ask Page require a readable active tab.',
    nextSteps: [
      'Click the VaultLens icon on the page first (grants activeTab).',
      'Reload the page and try again.',
    ],
  },
  EXTRACT_QUALITY_LOW: {
    message: 'Page content could not be extracted reliably.',
    impact: 'Dynamic SPAs may not expose readable main content.',
    nextSteps: [
      'Select the text you care about and use Translate or paste into Ask.',
      'Wait for the page to finish loading, then retry.',
    ],
  },
  CONTENT_TOO_LONG: {
    message: 'Page content exceeds the model context window.',
    impact: 'VaultLens will chunk and map-reduce; quality may vary on very long pages.',
    nextSteps: [
      'Try Quick summary first.',
      'Ask a focused question about a specific section.',
    ],
  },
  CONTENT_INSUFFICIENT: {
    message: 'There is not enough readable content on this page.',
    impact: 'Summary and Ask Page need extractable text.',
    nextSteps: ['Select text manually.', 'Open a content-rich page and retry.'],
  },
  MODEL_UNAVAILABLE: {
    message: 'The selected local model is not available.',
    impact: 'This task cannot run until a Provider is ready.',
    nextSteps: [
      'Check Chrome Built-in AI availability in Onboarding.',
      'Or configure Ollama and select a local model.',
    ],
  },
  MODEL_DOWNLOAD_FAILED: {
    message: 'Model or language pack download failed.',
    impact: 'The feature that needs this model cannot start.',
    nextSteps: [
      'Temporarily disable Offline Lock if enabled.',
      'Retry the download when network is available.',
      'Switch to Ollama if Chrome Built-in AI remains unavailable.',
    ],
  },
  PROVIDER_UNHEALTHY: {
    message: 'The selected Provider failed its health check.',
    impact: 'Tasks routed to this Provider will fail until it recovers.',
    nextSteps: ['Open Privacy Center / Settings and re-run capability check.'],
  },
  OLLAMA_UNREACHABLE: {
    message: 'Cannot reach Ollama at 127.0.0.1:11434.',
    impact: 'Ollama-backed tasks will not run.',
    nextSteps: [
      'Start Ollama locally.',
      'Confirm `ollama list` works in a terminal.',
      'Use the Connection Test button in Onboarding.',
    ],
  },
  OLLAMA_CORS: {
    message: 'Ollama rejected the extension origin (CORS).',
    impact: 'The browser cannot call Ollama until origins are allowlisted.',
    nextSteps: [
      'Set OLLAMA_ORIGINS to include this extension origin (see Onboarding guide).',
      'Prefer allowing only the VaultLens extension origin, not all extensions.',
      'Restart Ollama and retry the connection test.',
    ],
  },
  TASK_CANCELLED: {
    message: 'Task was cancelled.',
    impact: 'Partial output may be incomplete.',
    nextSteps: ['Start the task again if needed.'],
  },
  OFFLINE_LOCK_BLOCKED: {
    message: 'Offline Lock blocked a network operation.',
    impact: 'Downloads, license refresh, and non-loopback requests are paused.',
    nextSteps: [
      'Temporarily unlock Offline Lock to download a model/language pack.',
      'Ollama loopback remains allowed while Offline Lock is on.',
    ],
  },
  RETRIEVAL_LOW_CONFIDENCE: {
    message: 'Not enough information found on the current page.',
    impact: 'VaultLens will not invent an answer from model knowledge.',
    nextSteps: [
      'Rephrase the question using terms from the page.',
      'Select a relevant passage and ask again.',
    ],
  },
  UNKNOWN: {
    message: 'An unexpected error occurred.',
    impact: 'The current task could not complete.',
    nextSteps: ['Retry the task.', 'Switch Provider and try again.'],
  },
};

export function createAppError(
  code: ErrorCode,
  overrides?: Partial<Pick<AppError, 'message' | 'cause' | 'impact' | 'nextSteps'>>,
): AppError {
  const base = ERROR_CATALOG[code];
  return {
    code,
    message: overrides?.message ?? base.message,
    cause: overrides?.cause,
    impact: overrides?.impact ?? base.impact,
    nextSteps: overrides?.nextSteps ?? base.nextSteps,
  };
}

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value
  );
}
