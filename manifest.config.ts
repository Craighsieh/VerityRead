import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'VaultLens',
  version: '0.1.0',
  description:
    'Privacy-first local AI browser assistant. Summarize, ask, and translate the current page without sending page content to cloud inference.',
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
  action: {
    default_title: 'Open VaultLens',
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
  content_security_policy: {
    extension_pages:
      "script-src 'self'; object-src 'none'; connect-src 'self' http://127.0.0.1:11434;",
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  offline_enabled: true,
});
