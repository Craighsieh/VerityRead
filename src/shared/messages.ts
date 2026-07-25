import type {
  AppError,
  Availability,
  Capability,
  ContextScope,
  ExtractedPage,
  GenerateEvent,
  PrivacyReceipt,
  ProviderId,
  ProviderStatus,
  SourceCitation,
  SummarizeMode,
  TranslateResult,
  UserPreferences,
} from './types';

/** Discriminated union for all cross-context messages */

export type MessageType =
  | 'PING'
  | 'PONG'
  | 'EXTRACT_PAGE'
  | 'EXTRACT_PAGE_RESULT'
  | 'JUMP_TO_SOURCE'
  | 'JUMP_TO_SOURCE_RESULT'
  | 'HIGHLIGHT_SELECTION'
  | 'GET_SELECTION'
  | 'GET_SELECTION_RESULT'
  | 'GET_SITE_ACCESS'
  | 'REQUEST_SITE_ACCESS'
  | 'REMOVE_SITE_ACCESS'
  | 'SITE_ACCESS_RESULT'
  | 'SUMMARIZE'
  | 'ASK_PAGE'
  | 'TRANSLATE'
  | 'CANCEL_TASK'
  | 'STREAM_EVENT'
  | 'TASK_RESULT'
  | 'TASK_ERROR'
  | 'HEALTH_CHECK'
  | 'HEALTH_CHECK_RESULT'
  | 'CAPABILITY_CHECK'
  | 'CAPABILITY_CHECK_RESULT'
  | 'GET_PREFERENCES'
  | 'SET_PREFERENCES'
  | 'PREFERENCES_RESULT'
  | 'CLEAR_LOCAL_DATA'
  | 'CLEAR_LOCAL_DATA_RESULT'
  | 'OPEN_SIDE_PANEL'
  | 'CONTEXT_MENU_TRANSLATE'
  | 'CONTEXT_MENU_ACTION'
  | 'PRIVACY_RECEIPT';

export interface BaseMessage {
  type: MessageType;
  taskId?: string;
  requestId: string;
}

export interface PingMessage extends BaseMessage {
  type: 'PING';
  from: 'background' | 'sidepanel' | 'content';
}

export interface PongMessage extends BaseMessage {
  type: 'PONG';
  from: 'background' | 'sidepanel' | 'content';
}

export interface ExtractPageMessage extends BaseMessage {
  type: 'EXTRACT_PAGE';
  taskId: string;
  scope: ContextScope;
  selectionText?: string;
}

export interface ExtractPageResultMessage extends BaseMessage {
  type: 'EXTRACT_PAGE_RESULT';
  taskId: string;
  page?: ExtractedPage;
  error?: AppError;
}

export interface JumpToSourceMessage extends BaseMessage {
  type: 'JUMP_TO_SOURCE';
  sourceBlockId: string;
  locator: string;
}

export interface JumpToSourceResultMessage extends BaseMessage {
  type: 'JUMP_TO_SOURCE_RESULT';
  success: boolean;
  error?: AppError;
}

export interface GetSelectionMessage extends BaseMessage {
  type: 'GET_SELECTION';
}

export interface GetSelectionResultMessage extends BaseMessage {
  type: 'GET_SELECTION_RESULT';
  text: string;
}

export interface GetSiteAccessMessage extends BaseMessage {
  type: 'GET_SITE_ACCESS';
}

export interface RequestSiteAccessMessage extends BaseMessage {
  type: 'REQUEST_SITE_ACCESS';
}

export interface RemoveSiteAccessMessage extends BaseMessage {
  type: 'REMOVE_SITE_ACCESS';
}

export interface SiteAccessResultMessage extends BaseMessage {
  type: 'SITE_ACCESS_RESULT';
  origin?: string;
  originPattern?: string;
  hasPersistentAccess: boolean;
  canRequest: boolean;
  granted?: boolean;
  error?: AppError;
}

export interface SummarizeMessage extends BaseMessage {
  type: 'SUMMARIZE';
  taskId: string;
  mode: SummarizeMode;
  useCache?: boolean;
  providerId?: ProviderId;
}

export interface AskPageMessage extends BaseMessage {
  type: 'ASK_PAGE';
  taskId: string;
  question: string;
  providerId?: ProviderId;
}

export interface TranslateMessage extends BaseMessage {
  type: 'TRANSLATE';
  taskId: string;
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
  providerId?: ProviderId;
}

export interface CancelTaskMessage extends BaseMessage {
  type: 'CANCEL_TASK';
  taskId: string;
}

export interface StreamEventMessage extends BaseMessage {
  type: 'STREAM_EVENT';
  event: GenerateEvent;
}

export interface TaskResultMessage extends BaseMessage {
  type: 'TASK_RESULT';
  taskId: string;
  kind: 'summarize' | 'ask' | 'translate';
  text: string;
  citations?: SourceCitation[];
  translate?: TranslateResult;
  receipt: PrivacyReceipt;
  fromCache?: boolean;
}

export interface TaskErrorMessage extends BaseMessage {
  type: 'TASK_ERROR';
  taskId: string;
  error: AppError;
}

export interface HealthCheckMessage extends BaseMessage {
  type: 'HEALTH_CHECK';
  providerId?: ProviderId;
}

export interface HealthCheckResultMessage extends BaseMessage {
  type: 'HEALTH_CHECK_RESULT';
  statuses: ProviderStatus[];
}

export interface CapabilityCheckMessage extends BaseMessage {
  type: 'CAPABILITY_CHECK';
}

export interface CapabilityCheckResultMessage extends BaseMessage {
  type: 'CAPABILITY_CHECK_RESULT';
  chrome: {
    languageModel: Availability;
    summarizer: Availability;
    translator: Availability;
    webgpu: boolean;
  };
  ollama: ProviderStatus;
  capabilities: Capability[];
}

export interface GetPreferencesMessage extends BaseMessage {
  type: 'GET_PREFERENCES';
}

export interface SetPreferencesMessage extends BaseMessage {
  type: 'SET_PREFERENCES';
  preferences: Partial<UserPreferences>;
}

export interface PreferencesResultMessage extends BaseMessage {
  type: 'PREFERENCES_RESULT';
  preferences: UserPreferences;
}

export interface ClearLocalDataMessage extends BaseMessage {
  type: 'CLEAR_LOCAL_DATA';
  scopes: Array<'preferences' | 'cache' | 'history' | 'all'>;
}

export interface ClearLocalDataResultMessage extends BaseMessage {
  type: 'CLEAR_LOCAL_DATA_RESULT';
  success: boolean;
}

export interface OpenSidePanelMessage extends BaseMessage {
  type: 'OPEN_SIDE_PANEL';
}

export interface ContextMenuTranslateMessage extends BaseMessage {
  type: 'CONTEXT_MENU_TRANSLATE';
  text: string;
}

export interface ContextMenuActionMessage extends BaseMessage {
  type: 'CONTEXT_MENU_ACTION';
  action: 'translate' | 'explain' | 'simplify' | 'ask';
  text: string;
}

export interface PrivacyReceiptMessage extends BaseMessage {
  type: 'PRIVACY_RECEIPT';
  receipt: PrivacyReceipt;
}

export type ExtensionMessage =
  | PingMessage
  | PongMessage
  | ExtractPageMessage
  | ExtractPageResultMessage
  | JumpToSourceMessage
  | JumpToSourceResultMessage
  | GetSelectionMessage
  | GetSelectionResultMessage
  | GetSiteAccessMessage
  | RequestSiteAccessMessage
  | RemoveSiteAccessMessage
  | SiteAccessResultMessage
  | SummarizeMessage
  | AskPageMessage
  | TranslateMessage
  | CancelTaskMessage
  | StreamEventMessage
  | TaskResultMessage
  | TaskErrorMessage
  | HealthCheckMessage
  | HealthCheckResultMessage
  | CapabilityCheckMessage
  | CapabilityCheckResultMessage
  | GetPreferencesMessage
  | SetPreferencesMessage
  | PreferencesResultMessage
  | ClearLocalDataMessage
  | ClearLocalDataResultMessage
  | OpenSidePanelMessage
  | ContextMenuTranslateMessage
  | ContextMenuActionMessage
  | PrivacyReceiptMessage;

export function createRequestId(): string {
  return `req_${crypto.randomUUID()}`;
}

export function createTaskId(): string {
  return `task_${crypto.randomUUID()}`;
}

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'requestId' in value &&
    typeof (value as ExtensionMessage).type === 'string'
  );
}
