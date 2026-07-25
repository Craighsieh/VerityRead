import { describe, expect, it } from 'vitest';
import { chunkPage, estimateTokens, planMapReduce } from '@/core/chunk';
import type { ExtractedPage } from '@/shared/types';

function makePage(texts: string[]): ExtractedPage {
  return {
    title: 'Test',
    url: 'https://example.com/doc',
    domain: 'example.com',
    extractedAt: new Date().toISOString(),
    contextScope: 'page',
    plainText: texts.join('\n\n'),
    qualityScore: 0.9,
    wordCount: texts.join(' ').split(/\s+/).length,
    blocks: texts.map((text, order) => ({
      sourceBlockId: `sb_${order}`,
      text,
      tagName: order === 0 ? 'h1' : 'p',
      headingLevel: order === 0 ? 1 : undefined,
      locator: `p:nth-of-type(${order + 1})`,
      fingerprint: `fp${order}`,
      order,
    })),
  };
}

describe('chunkPage', () => {
  it('keeps small pages as few chunks', () => {
    const page = makePage(['Hello world', 'Second paragraph with more words.']);
    const chunks = chunkPage(page, 500);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.sourceBlockIds.length).toBeGreaterThan(0);
  });

  it('never silently drops oversized content — splits instead', () => {
    const long = 'Sentence one. '.repeat(400);
    const page = makePage([long]);
    const chunks = chunkPage(page, 100);
    const totalText = chunks.map((c) => c.text).join(' ');
    expect(chunks.length).toBeGreaterThan(1);
    expect(totalText.length).toBeGreaterThan(1000);
  });
});

describe('planMapReduce', () => {
  it('flags map-reduce when total exceeds context', () => {
    const page = makePage(['word '.repeat(5000)]);
    const plan = planMapReduce(page, 500);
    expect(plan.needsMapReduce).toBe(true);
    expect(plan.chunks.length).toBeGreaterThan(1);
  });
});

describe('estimateTokens', () => {
  it('returns positive estimate', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('a'.repeat(40))).toBe(10);
  });
});
