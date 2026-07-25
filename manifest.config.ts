import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: '__MSG_extensionName__',
  version: '0.1.0',
  default_locale: 'en',
  description: '__MSG_extensionDescription__',
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
  action: {
    default_title: '__MSG_actionTitle__',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
    },
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  permissions: ['activeTab', 'scripting', 'storage', 'sidePanel', 'contextMenus'],
  host_permissions: ['http://127.0.0.1:11434/*'],
  optional_host_permissions: ['http://*/*', 'https://*/*'],
  content_security_policy: {
    extension_pages:
      "script-src 'self'; object-src 'none'; connect-src 'self' http://127.0.0.1:11434;",
  },
  offline_enabled: true,
});
