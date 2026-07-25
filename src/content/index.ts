import { createAppError, isAppError } from '@/shared/errors';
import { createRequestId, isExtensionMessage } from '@/shared/messages';
import { extractContextFromDocument } from '@/core/extract';

const HIGHLIGHT_CLASS = 'vaultlens-source-highlight';
const HIGHLIGHT_STYLE_ID = 'vaultlens-highlight-style';

function ensureHighlightStyle(): void {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 2px solid #5b8cff !important;
      background-color: rgba(91, 140, 255, 0.25) !important;
      transition: background-color 0.3s ease;
    }
  `;
  document.documentElement.appendChild(style);
}

function jumpToLocator(locator: string): boolean {
  ensureHighlightStyle();
  document
    .querySelectorAll(`.${HIGHLIGHT_CLASS}`)
    .forEach((el) => el.classList.remove(HIGHLIGHT_CLASS));

  if (locator.startsWith('synthetic:')) {
    // Best-effort: scroll to first substantial paragraph
    const p = document.querySelector('article p, main p, p');
    if (p) {
      p.classList.add(HIGHLIGHT_CLASS);
      p.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => p.classList.remove(HIGHLIGHT_CLASS), 2000);
      return true;
    }
    return false;
  }

  let el: Element | null = null;
  try {
    el = document.querySelector(locator);
  } catch {
    el = null;
  }
  if (!el) return false;

  el.classList.add(HIGHLIGHT_CLASS);
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => el?.classList.remove(HIGHLIGHT_CLASS), 2000);
  return true;
}

chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  if (!isExtensionMessage(raw)) return false;

  (async () => {
    switch (raw.type) {
      case 'PING':
        sendResponse({
          type: 'PONG',
          requestId: raw.requestId,
          from: 'content',
        });
        return;

      case 'EXTRACT_PAGE': {
        try {
          const page = extractContextFromDocument(document, raw.scope, raw.selectionText);
          sendResponse({
            type: 'EXTRACT_PAGE_RESULT',
            requestId: raw.requestId,
            taskId: raw.taskId,
            page,
          });
        } catch (err) {
          sendResponse({
            type: 'EXTRACT_PAGE_RESULT',
            requestId: raw.requestId,
            taskId: raw.taskId,
            error: isAppError(err)
              ? err
              : createAppError('PAGE_INACCESSIBLE', {
                  cause: err instanceof Error ? err.message : String(err),
                }),
          });
        }
        return;
      }

      case 'JUMP_TO_SOURCE': {
        const success = jumpToLocator(raw.locator);
        sendResponse({
          type: 'JUMP_TO_SOURCE_RESULT',
          requestId: raw.requestId,
          success,
          error: success
            ? undefined
            : createAppError('PAGE_INACCESSIBLE', {
                message: 'Could not locate the source block on the page.',
              }),
        });
        return;
      }

      case 'GET_SELECTION': {
        sendResponse({
          type: 'GET_SELECTION_RESULT',
          requestId: raw.requestId ?? createRequestId(),
          text: window.getSelection()?.toString() ?? '',
        });
        return;
      }

      default:
        return;
    }
  })();

  return true;
});
