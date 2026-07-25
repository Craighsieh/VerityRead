import {
  chromium,
  test as base,
  type BrowserContext,
  type Worker,
} from '@playwright/test';
import { resolve } from 'node:path';

interface ExtensionFixtures {
  context: BrowserContext;
  extensionId: string;
  serviceWorker: Worker;
}

export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    const extensionPath = resolve(process.cwd(), 'dist');
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      locale: 'en-US',
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    await use(context);
    await context.close();
  },

  serviceWorker: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers();
    serviceWorker ??= await context.waitForEvent('serviceworker');
    await use(serviceWorker);
  },

  extensionId: async ({ serviceWorker }, use) => {
    const extensionId = new URL(serviceWorker.url()).hostname;
    await use(extensionId);
  },
});

export const expect = test.expect;
