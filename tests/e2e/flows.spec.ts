/**
 * Lightweight fixture checks that complement the loaded-extension flow suite.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURE = join(process.cwd(), 'tests/fixtures/article.html');

test('article fixture contains summarizable structure', async ({ page }) => {
  await page.setContent(readFileSync(FIXTURE, 'utf8'));
  await expect(page.locator('h1')).toHaveText('Understanding Local AI Assistants');
  const paragraphs = page.locator('article p');
  await expect(paragraphs).toHaveCount(2);
  await expect(page.locator('.ads')).toBeVisible();
});
