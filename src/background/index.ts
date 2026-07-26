import { createRequestId, createTaskId } from '@/shared/messages';
import { onMessage, sendTabMessage } from '@/shared/messaging';
import { createAppError } from '@/shared/errors';
import { isProtectedUrl } from '@/core/extract';
import { clearAllLocalData, getPreferences, setPreferences } from '@/storage';
import { providerRegistry } from '@/providers/registry';
import { probeChromeAvailability } from '@/providers/chromeBuiltin';
import contentScriptFile from '@/content/index.ts?script';
import { productName, t } from '@/i18n';
import {
  PENDING_CONTEXT_MENU_ACTION_KEY,
  type PendingContextMenuAction,
} from '@/shared/contextMenuAction';
import { waitForContentScriptReady } from './contentScriptReady';

const CONTEXT_MENU_ACTIONS = {
  translate: 'verityread-translate-selection',
  explain: 'verityread-explain-selection',
  simplify: 'verityread-simplify-selection',
  ask: 'verityread-ask-selection',
} as const;

type ContextMenuAction = keyof typeof CONTEXT_MENU_ACTIONS;

function originPatternFromUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return `${url.origin}/*`;
  } catch {
    return null;
  }
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function ensureContentScript(tabId: number): Promise<void> {
  const existing = await sendTabMessage(tabId, { type: 'PING', from: 'background' });
  if (existing?.type === 'PONG') return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [contentScriptFile],
    });
  } catch (error) {
    throw createAppError('PAGE_ACCESS_REQUIRED', {
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  const ready = await waitForContentScriptReady(async () => {
    const response = await sendTabMessage(tabId, {
      type: 'PING',
      from: 'background',
    });
    return response?.type === 'PONG';
  });
  if (!ready) {
    throw createAppError('PAGE_INACCESSIBLE', {
      cause: 'The page reader did not start after permission was granted.',
    });
  }
}

async function siteAccessResult(requestId: string, action?: 'request' | 'remove') {
  const tab = await getActiveTab();
  const originPattern = originPatternFromUrl(tab?.url);
  if (!originPattern) {
    return {
      type: 'SITE_ACCESS_RESULT' as const,
      requestId,
      hasPersistentAccess: false,
      canRequest: false,
      error: createAppError(tab?.url ? 'PAGE_PROTECTED' : 'PAGE_ACCESS_REQUIRED'),
    };
  }

  let granted: boolean | undefined;
  if (action === 'request') {
    granted = await chrome.permissions.request({ origins: [originPattern] });
  } else if (action === 'remove') {
    granted = await chrome.permissions.remove({ origins: [originPattern] });
  }

  const hasPersistentAccess = await chrome.permissions.contains({
    origins: [originPattern],
  });
  return {
    type: 'SITE_ACCESS_RESULT' as const,
    requestId,
    origin: new URL(tab?.url ?? originPattern).origin,
    originPattern,
    hasPersistentAccess,
    canRequest: true,
    granted,
  };
}

async function setupSidePanel(): Promise<void> {
  if (chrome.sidePanel?.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
}

function setupContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    const labels: Record<ContextMenuAction, string> = {
      translate: t('contextMenuTranslate', { product: productName() }),
      explain: t('contextMenuExplain', { product: productName() }),
      simplify: t('contextMenuSimplify', { product: productName() }),
      ask: t('contextMenuAsk', { product: productName() }),
    };
    for (const [action, id] of Object.entries(CONTEXT_MENU_ACTIONS) as Array<
      [ContextMenuAction, string]
    >) {
      chrome.contextMenus.create({
        id,
        title: labels[action],
        contexts: ['selection'],
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  void setupSidePanel();
  setupContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  void setupSidePanel();
  setupContextMenus();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const action = (
    Object.entries(CONTEXT_MENU_ACTIONS) as Array<[ContextMenuAction, string]>
  ).find(([, id]) => id === info.menuItemId)?.[0];
  if (!action || !tab?.id) return;
  const text = info.selectionText?.trim() ?? '';
  if (!text) return;

  const pendingAction: PendingContextMenuAction = {
    requestId: createRequestId(),
    action,
    text,
    createdAt: Date.now(),
  };

  try {
    await chrome.sidePanel.open({ tabId: tab.id });
    // Session storage bridges the brief interval before a newly opened panel
    // registers its listeners. The panel removes the selection after claiming it.
    await chrome.storage.session.set({
      [PENDING_CONTEXT_MENU_ACTION_KEY]: pendingAction,
    });
  } catch {
    // Side panel open may fail on restricted pages; do not retain stale text.
    await chrome.storage.session
      .remove(PENDING_CONTEXT_MENU_ACTION_KEY)
      .catch(() => undefined);
  }
});

onMessage(async (message, sender) => {
  switch (message.type) {
    case 'PING':
      return {
        type: 'PONG',
        requestId: message.requestId,
        from: 'background',
      };

    case 'OPEN_SIDE_PANEL': {
      const tabId = sender.tab?.id;
      if (tabId != null) {
        await chrome.sidePanel.open({ tabId });
      }
      return { type: 'PONG', requestId: message.requestId, from: 'background' };
    }

    case 'GET_PREFERENCES': {
      const preferences = await getPreferences();
      return {
        type: 'PREFERENCES_RESULT',
        requestId: message.requestId,
        preferences,
      };
    }

    case 'GET_SITE_ACCESS':
      return siteAccessResult(message.requestId);

    case 'REQUEST_SITE_ACCESS':
      return siteAccessResult(message.requestId, 'request');

    case 'REMOVE_SITE_ACCESS':
      return siteAccessResult(message.requestId, 'remove');

    case 'SET_PREFERENCES': {
      const preferences = await setPreferences(message.preferences);
      if (message.preferences.defaultProviderId) {
        await providerRegistry.setDefault(message.preferences.defaultProviderId);
      }
      if (message.preferences.ollamaBaseUrl || message.preferences.ollamaModel) {
        await providerRegistry.init();
      }
      return {
        type: 'PREFERENCES_RESULT',
        requestId: message.requestId,
        preferences,
      };
    }

    case 'CLEAR_LOCAL_DATA': {
      if (message.scopes.includes('all')) {
        await clearAllLocalData();
      } else {
        // selective clear handled by storage helpers in sidepanel for cache
        if (message.scopes.includes('preferences')) {
          await chrome.storage.local.clear();
        }
      }
      return {
        type: 'CLEAR_LOCAL_DATA_RESULT',
        requestId: message.requestId,
        success: true,
      };
    }

    case 'HEALTH_CHECK': {
      await providerRegistry.init();
      const statuses = message.providerId
        ? [await providerRegistry.get(message.providerId).healthCheck()]
        : await providerRegistry.healthAll();
      return {
        type: 'HEALTH_CHECK_RESULT',
        requestId: message.requestId,
        statuses,
      };
    }

    case 'CAPABILITY_CHECK': {
      // Chrome Built-in AI must be probed from a window context (side panel).
      // Background returns Ollama + placeholder for Chrome; side panel merges.
      await providerRegistry.init();
      const ollama = await providerRegistry.getOllama().healthCheck();
      const chromeProbe = await probeChromeAvailability().catch(() => ({
        languageModel: 'unavailable' as const,
        summarizer: 'unavailable' as const,
        translator: 'unavailable' as const,
        webgpu: false,
      }));
      return {
        type: 'CAPABILITY_CHECK_RESULT',
        requestId: message.requestId,
        chrome: chromeProbe,
        ollama,
        capabilities: await providerRegistry.get().capabilities(),
      };
    }

    case 'EXTRACT_PAGE': {
      const tab = await getActiveTab();
      if (!tab?.id) {
        return {
          type: 'EXTRACT_PAGE_RESULT',
          requestId: message.requestId,
          taskId: message.taskId,
          error: createAppError('PAGE_INACCESSIBLE'),
        };
      }
      // Chrome may omit tab.url when neither activeTab nor an exact optional
      // origin grant is active, so only classify protected pages when present.
      if (tab.url && isProtectedUrl(tab.url)) {
        return {
          type: 'EXTRACT_PAGE_RESULT',
          requestId: message.requestId,
          taskId: message.taskId,
          error: createAppError('PAGE_PROTECTED'),
        };
      }

      try {
        // Inject only after the user starts a page task. activeTab gives
        // one-time access; exact optional origin grants support persistent use.
        await ensureContentScript(tab.id);
        const result = await sendTabMessage(tab.id, {
          type: 'EXTRACT_PAGE',
          taskId: message.taskId,
          scope: message.scope,
          selectionText: message.selectionText,
        });
        return (
          result ?? {
            type: 'EXTRACT_PAGE_RESULT',
            requestId: message.requestId,
            taskId: message.taskId,
            error: createAppError('PAGE_INACCESSIBLE'),
          }
        );
      } catch (error) {
        return {
          type: 'EXTRACT_PAGE_RESULT',
          requestId: message.requestId,
          taskId: message.taskId,
          error:
            typeof error === 'object' && error !== null && 'code' in error
              ? (error as ReturnType<typeof createAppError>)
              : createAppError('PAGE_ACCESS_REQUIRED', {
                  cause: error instanceof Error ? error.message : String(error),
                }),
        };
      }
    }

    case 'JUMP_TO_SOURCE': {
      const tab = await getActiveTab();
      if (!tab?.id) {
        return {
          type: 'JUMP_TO_SOURCE_RESULT',
          requestId: message.requestId,
          success: false,
          error: createAppError('PAGE_INACCESSIBLE'),
        };
      }
      await ensureContentScript(tab.id);
      const result = await sendTabMessage(tab.id, {
        type: 'JUMP_TO_SOURCE',
        sourceBlockId: message.sourceBlockId,
        locator: message.locator,
      });
      return (
        result ?? {
          type: 'JUMP_TO_SOURCE_RESULT',
          requestId: message.requestId,
          success: false,
        }
      );
    }

    case 'GET_SELECTION': {
      const tab = await getActiveTab();
      if (!tab?.id) {
        return {
          type: 'GET_SELECTION_RESULT',
          requestId: message.requestId,
          text: '',
        };
      }
      try {
        await ensureContentScript(tab.id);
      } catch {
        return {
          type: 'GET_SELECTION_RESULT',
          requestId: message.requestId,
          text: '',
        };
      }
      const result = await sendTabMessage(tab.id, { type: 'GET_SELECTION' });
      return (
        result ?? {
          type: 'GET_SELECTION_RESULT',
          requestId: message.requestId,
          text: '',
        }
      );
    }

    default:
      return undefined;
  }
});

// Keep SW alive helper reference
void createTaskId;
