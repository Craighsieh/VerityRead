/**
 * Capture real extension UI in each supported Chrome locale.
 *
 * The 420px panel captures are composed beside the real article fixture by
 * compose_store_screenshots.py to reproduce the Chrome side-panel layout.
 */
import { chromium } from '@playwright/test';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

interface CaptureLocale {
  code: 'en' | 'zh_TW' | 'zh_CN' | 'ja' | 'ko';
  chromeLocale: string;
  targetLanguage: string;
}

const ROOT = process.cwd();
const EXTENSION_PATH = resolve(ROOT, 'dist');
const RAW_PATH = resolve(ROOT, 'assets/store/screenshots/.raw');
const ARTICLE_PATH = resolve(ROOT, 'tests/fixtures/article.html');
const SCREENSHOT_MODEL =
  process.env.VERITYREAD_SCREENSHOT_OLLAMA_MODEL ?? 'llama3.2:latest';

const locales: CaptureLocale[] = [
  { code: 'en', chromeLocale: 'en-US', targetLanguage: 'zh-Hans' },
  { code: 'zh_TW', chromeLocale: 'zh-TW', targetLanguage: 'en' },
  { code: 'zh_CN', chromeLocale: 'zh-CN', targetLanguage: 'en' },
  { code: 'ja', chromeLocale: 'ja-JP', targetLanguage: 'en' },
  { code: 'ko', chromeLocale: 'ko-KR', targetLanguage: 'en' },
];

const articleStyle = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0 60px 60px;
    color: #182136;
    background:
      radial-gradient(circle at 8% 8%, rgba(25, 183, 178, .14), transparent 28%),
      linear-gradient(145deg, #f7fafc, #eaf0f8);
    font: 17px/1.65 Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  nav {
    margin: 0 -60px 48px;
    padding: 18px 60px;
    color: #4d5d72;
    background: rgba(255, 255, 255, .88);
    border-bottom: 1px solid #d8e1eb;
    font-size: 14px;
  }
  article {
    max-width: 690px;
    padding: 42px 50px;
    background: rgba(255, 255, 255, .96);
    border: 1px solid #dce5ef;
    border-radius: 20px;
    box-shadow: 0 22px 60px rgba(38, 55, 83, .13);
  }
  h1 { margin: 0 0 22px; color: #172b59; font-size: 38px; line-height: 1.15; }
  h2 { margin: 30px 0 8px; color: #145d70; font-size: 22px; }
  p, ul { color: #405065; }
  li { margin: 7px 0; }
  aside { display: none; }
`;

async function captureLocale(locale: CaptureLocale): Promise<void> {
  const localePath = resolve(RAW_PATH, locale.code);
  await mkdir(localePath, { recursive: true });

  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    colorScheme: 'dark',
    locale: locale.chromeLocale,
    args: [
      `--lang=${locale.chromeLocale}`,
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  try {
    let [serviceWorker] = context.serviceWorkers();
    serviceWorker ??= await context.waitForEvent('serviceworker');
    const extensionId = new URL(serviceWorker.url()).hostname;

    const articlePage = await context.newPage();
    await articlePage.setViewportSize({ width: 860, height: 800 });
    await articlePage.goto(`file://${ARTICLE_PATH}`);
    await articlePage.addStyleTag({ content: articleStyle });
    await articlePage.screenshot({
      path: resolve(localePath, 'article.png'),
    });

    const panelPage = await context.newPage();
    await panelPage.setViewportSize({ width: 420, height: 800 });
    await panelPage.goto(
      `chrome-extension://${extensionId}/src/sidepanel/index.html`,
    );
    await panelPage.locator('.app').waitFor();
    await panelPage.evaluate(() => window.scrollTo(0, 0));
    await panelPage.screenshot({
      path: resolve(localePath, 'onboarding-panel.png'),
    });

    await panelPage.evaluate(
      async ({ model, targetLanguage }) => {
        await chrome.storage.local.set({
          'verityread.storageVersion': 2,
          'verityread.preferences': {
            defaultProviderId: 'ollama',
            ollamaBaseUrl: 'http://127.0.0.1:11434',
            ollamaModel: model,
            targetLanguage,
            offlineLock: false,
            historyEnabled: false,
            historyRetentionDays: 7,
            onboardingComplete: true,
            privacyConsentVersion: '2026-07-26',
            cacheSummaries: false,
            readingLevel: 'standard',
          },
        });
      },
      { model: SCREENSHOT_MODEL, targetLanguage: locale.targetLanguage },
    );
    await panelPage.reload();
    await panelPage.locator('.chat-shell').waitFor();
    await panelPage.locator('.provider-chip .status-dot.ok').waitFor({
      timeout: 10_000,
    });
    await panelPage.evaluate(() => window.scrollTo(0, 0));
    await panelPage.screenshot({
      path: resolve(localePath, 'reading-panel.png'),
    });
  } finally {
    await context.close();
  }
}

await rm(RAW_PATH, { recursive: true, force: true });
for (const locale of locales) {
  await captureLocale(locale);
}
