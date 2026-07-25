import {
  createRequestId,
  isExtensionMessage,
  type ExtensionMessage,
  type MessageType,
} from './messages';

/** Distributive message input so each variant keeps its own fields. */
export type MessageInput = {
  [K in MessageType]: Omit<Extract<ExtensionMessage, { type: K }>, 'requestId'> & {
    requestId?: string;
  };
}[MessageType];

export async function sendMessage(
  message: MessageInput,
): Promise<ExtensionMessage | undefined> {
  const payload = {
    ...message,
    requestId: message.requestId ?? createRequestId(),
  } as ExtensionMessage;
  try {
    return (await chrome.runtime.sendMessage(payload)) as ExtensionMessage | undefined;
  } catch {
    return undefined;
  }
}

export async function sendTabMessage(
  tabId: number,
  message: MessageInput,
): Promise<ExtensionMessage | undefined> {
  const payload = {
    ...message,
    requestId: message.requestId ?? createRequestId(),
  } as ExtensionMessage;
  try {
    return (await chrome.tabs.sendMessage(tabId, payload)) as
      | ExtensionMessage
      | undefined;
  } catch {
    return undefined;
  }
}

export function onMessage(
  handler: (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
  ) => Promise<ExtensionMessage | void> | ExtensionMessage | void,
): void {
  chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
    if (!isExtensionMessage(raw)) return false;
    Promise.resolve(handler(raw, sender))
      .then((result) => sendResponse(result))
      .catch((err: unknown) => {
        sendResponse({
          type: 'TASK_ERROR',
          requestId: raw.requestId,
          taskId: raw.taskId ?? 'unknown',
          error: {
            code: 'UNKNOWN',
            message: err instanceof Error ? err.message : String(err),
          },
        });
      });
    return true; // async
  });
}
