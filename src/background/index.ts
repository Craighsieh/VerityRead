import { createRequestId, createTaskId } from '@/shared/messages';
import { onMessage, sendTabMessage } from '@/shared/messaging';
import { createAppError } from '@/shared/errors';
import { isProtectedUrl } from '@/core/extract';
import { clearAllLocalData, getPreferences, setPreferences } from '@/storage';
import { providerRegistry } from '@/providers/registry';
import { probeChromeAvailability } from '@/providers/chromeBuiltin';

const CONTEXT_MENU_ACTIONS = {
  translate: 'vaultlens-translate-selection',
  explain: 'vaultlens-explain-selection',
  simplify: 'vaultlens-simplify-selection',
  ask: 'vaultlens-ask-selection',
} as const;

type ContextMenuAction = keyof typeof CONTEXT_MENU_ACTIONS;

async function setupSidePanel(): Promise<void> {
  if (chrome.sidePanel?.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
}

function setupContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    const labels: Record<ContextMenuAction, string> = {
      translate: '使用 VaultLens 翻译',
      explain: '使用 VaultLens 解释',
      simplify: '使用 VaultLens 简化',
      ask: '使用 VaultLens 追问',
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

  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch {
    // Side panel open may fail on restricted pages
  }

  // Notify side panel (broadcast); side panel listens via runtime.onMessage
  void chrome.runtime.sendMessage({
    type: 'CONTEXT_MENU_ACTION',
    requestId: createRequestId(),
    action,
    text,
  });
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
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        return {
          type: 'EXTRACT_PAGE_RESULT',
          requestId: message.requestId,
          taskId: message.taskId,
          error: createAppError('PAGE_INACCESSIBLE'),
        };
      }
      // Chrome may omit tab.url without the broad `tabs` permission. The
      // statically registered content script can still serve the request, so
      // only classify protected pages when the URL is actually available.
      if (tab.url && isProtectedUrl(tab.url)) {
        return {
          type: 'EXTRACT_PAGE_RESULT',
          requestId: message.requestId,
          taskId: message.taskId,
          error: createAppError('PAGE_PROTECTED'),
        };
      }

      // Content script is declared in manifest for http(s). Retry once after ping.
      let result = await sendTabMessage(tab.id, {
        type: 'EXTRACT_PAGE',
        taskId: message.taskId,
        scope: message.scope,
        selectionText: message.selectionText,
      });
      if (!result) {
        // activeTab may be needed after user gesture; ping first
        await sendTabMessage(tab.id, { type: 'PING', from: 'background' });
        result = await sendTabMessage(tab.id, {
          type: 'EXTRACT_PAGE',
          taskId: message.taskId,
          scope: message.scope,
          selectionText: message.selectionText,
        });
      }
      return (
        result ?? {
          type: 'EXTRACT_PAGE_RESULT',
          requestId: message.requestId,
          taskId: message.taskId,
          error: createAppError('PAGE_INACCESSIBLE'),
        }
      );
    }

    case 'JUMP_TO_SOURCE': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        return {
          type: 'JUMP_TO_SOURCE_RESULT',
          requestId: message.requestId,
          success: false,
          error: createAppError('PAGE_INACCESSIBLE'),
        };
      }
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
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
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
