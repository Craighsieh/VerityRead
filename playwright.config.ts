import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  // Loaded MV3 profiles can crash when multiple bundled Chromium instances
  // initialize the same unpacked extension concurrently.
  workers: 1,
  retries: 0,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  reporter: [['list']],
});
