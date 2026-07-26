import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { test, expect } from './extension-fixtures';

const FIXTURE = join(process.cwd(), 'tests/fixtures/article.html');
const SENSITIVE_MARKER = 'Local AI assistants keep page content on the device';

test('loads the production MV3 bundle with least-privilege permissions', async ({
  serviceWorker,
}) => {
  const manifest = await serviceWorker.evaluate(() => chrome.runtime.getManifest());

  expect(manifest.manifest_version).toBe(3);
  expect(manifest.permissions).toEqual(
    expect.arrayContaining(['activeTab', 'scripting', 'storage', 'sidePanel']),
  );
  expect(manifest.host_permissions).toEqual(['http://127.0.0.1:11434/*']);
  expect(manifest.optional_host_permissions).toEqual(['http://*/*', 'https://*/*']);
  expect(manifest.content_scripts).toBeUndefined();
});

test('requires explicit privacy consent before capability setup', async ({
  page,
  extensionId,
}) => {
  await page.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);

  await expect(
    page.getByRole('heading', { name: 'Welcome to VerityRead' }),
  ).toBeVisible();
  const consent = page.getByRole('checkbox');
  const capabilityButton = page.getByRole('button', {
    name: 'Run device capability check',
  });

  await expect(consent).not.toBeChecked();
  await expect(capabilityButton).toBeDisabled();
  await consent.check();
  await expect(capabilityButton).toBeEnabled();
});

test('claims a queued context-menu action when the side panel cold-starts', async ({
  page,
  extensionId,
  serviceWorker,
}) => {
  await serviceWorker.evaluate(async () => {
    await chrome.storage.local.clear();
    await chrome.storage.session.clear();
    await chrome.storage.local.set({
      'verityread.storageVersion': 2,
      'verityread.preferences': {
        defaultProviderId: 'chrome-builtin',
        ollamaBaseUrl: 'http://127.0.0.1:11434',
        ollamaModel: '',
        targetLanguage: 'zh-Hans',
        offlineLock: false,
        historyEnabled: false,
        historyRetentionDays: 7,
        onboardingComplete: true,
        privacyConsentVersion: '2026-07-26',
        cacheSummaries: false,
        readingLevel: 'standard',
      },
    });
    await chrome.storage.session.set({
      pendingContextMenuAction: {
        requestId: 'context-e2e',
        action: 'explain',
        text: 'Selected article text',
        createdAt: Date.now(),
      },
    });
  });

  await page.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);

  await expect(page.getByText('Explain the selected text.')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const stored = await chrome.storage.session.get('pendingContextMenuAction');
        return stored.pendingContextMenuAction;
      }),
    )
    .toBeUndefined();
});

test('migrates legacy preferences to opt-in cache and fixed loopback', async ({
  page,
  extensionId,
  serviceWorker,
}) => {
  await serviceWorker.evaluate(async () => {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({
      'vaultlens.preferences': {
        cacheSummaries: true,
        ollamaBaseUrl: 'http://192.168.1.10:11434',
        onboardingComplete: true,
      },
    });
  });

  await page.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);
  await expect(
    page.getByRole('heading', { name: 'Welcome to VerityRead' }),
  ).toBeVisible();

  const preferences = await page.evaluate(async () => {
    const stored = await chrome.storage.local.get('verityread.preferences');
    return stored['verityread.preferences'];
  });

  expect(preferences.cacheSummaries).toBe(false);
  expect(preferences.ollamaBaseUrl).toBe('http://127.0.0.1:11434');
  expect(preferences.onboardingComplete).toBe(false);
  expect(preferences.privacyConsentVersion).toBeNull();
});

test('does not read a page or leak its content without a user grant', async ({
  context,
  extensionId,
}) => {
  const html = readFileSync(FIXTURE, 'utf8');
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address() as AddressInfo;
    const extensionPage = await context.newPage();
    await extensionPage.goto(
      `chrome-extension://${extensionId}/src/sidepanel/index.html`,
    );
    await expect(
      extensionPage.getByRole('heading', { name: 'Welcome to VerityRead' }),
    ).toBeVisible();

    const articlePage = await context.newPage();
    const violations: string[] = [];
    context.on('request', (request) => {
      if (
        !request.url().startsWith('http://127.0.0.1:') &&
        !request.url().startsWith('chrome-extension://')
      ) {
        const requestText = [
          request.url(),
          request.postData() ?? '',
          JSON.stringify(request.headers()),
        ].join('\n');
        if (requestText.includes(SENSITIVE_MARKER)) {
          violations.push(request.url());
        }
      }
    });

    await articlePage.goto(`http://127.0.0.1:${address.port}/article.html`);
    await expect(articlePage.getByRole('heading', { level: 1 })).toHaveText(
      'Understanding Local AI Assistants',
    );
    await articlePage.bringToFront();

    const result = await extensionPage.evaluate(async () => {
      return chrome.runtime.sendMessage({
        type: 'EXTRACT_PAGE',
        requestId: 'e2e_extract',
        taskId: 'task_e2e',
        scope: 'page',
      });
    });

    expect(result.error.code).toBe('PAGE_ACCESS_REQUIRED');
    expect(violations).toEqual([]);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
