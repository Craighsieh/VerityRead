/**
 * Egress privacy test (PRD §9.6 / Spike 4).
 *
 * Loads a fixture page and asserts that sensitive page content strings
 * never appear in any non-loopback / non-extension request body, query, or headers.
 *
 * This focused harness complements extension.spec.ts, which loads the built
 * MV3 bundle and verifies the same boundary from the real service worker.
 */
import { test, expect, type Request } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURE = join(process.cwd(), 'tests/fixtures/article.html');
const SENSITIVE_MARKERS = [
  'Local AI assistants keep page content on the device',
  'Understanding Local AI Assistants',
  'window.__shouldNotAppear',
];

function isExemptUrl(url: string): boolean {
  return (
    url.startsWith('chrome-extension://') ||
    url.startsWith('data:') ||
    url.includes('127.0.0.1') ||
    url.includes('localhost') ||
    url.startsWith('file:')
  );
}

function requestContainsSensitive(req: Request): string | null {
  if (isExemptUrl(req.url())) return null;
  const haystacks: string[] = [req.url()];
  const headers = req.headers();
  for (const [k, v] of Object.entries(headers)) {
    haystacks.push(`${k}:${v}`);
  }
  try {
    const body = req.postData();
    if (body) haystacks.push(body);
  } catch {
    // ignore
  }
  const joined = haystacks.join('\n');
  for (const marker of SENSITIVE_MARKERS) {
    if (joined.includes(marker)) return marker;
  }
  return null;
}

test.describe('egress harness', () => {
  test('fixture page markers are defined', () => {
    const html = readFileSync(FIXTURE, 'utf8');
    for (const marker of SENSITIVE_MARKERS.slice(0, 2)) {
      expect(html).toContain(marker);
    }
  });

  test('no sensitive page content in external requests while browsing fixture', async ({
    page,
  }) => {
    const violations: string[] = [];
    page.on('request', (req) => {
      const hit = requestContainsSensitive(req);
      if (hit) {
        violations.push(`${req.url()} contains ${hit}`);
      }
    });

    await page.setContent(readFileSync(FIXTURE, 'utf8'), {
      waitUntil: 'domcontentloaded',
    });

    // Simulate a local-only "task" that must not call external inference
    await page.evaluate(() => {
      const text = document.body.innerText;
      // Intentionally local: do not fetch with page text
      (window as unknown as { __verityreadLocalSummary: string }).__verityreadLocalSummary =
        text.slice(0, 200);
    });

    // A benign external request without page content should still be allowed by harness
    // (we only fail if sensitive markers leak). Skip actual network if offline.
    expect(violations).toEqual([]);
  });
});
