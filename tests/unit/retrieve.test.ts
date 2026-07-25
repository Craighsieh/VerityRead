import { describe, expect, it } from 'vitest';
import {
  retrieveForQuestion,
  retrieveSummaryCitations,
  CONFIDENCE_THRESHOLD,
} from '@/core/retrieve';
import type { ExtractedPage } from '@/shared/types';

const page: ExtractedPage = {
  title: 'API Guide',
  url: 'https://example.com/api',
  domain: 'example.com',
  extractedAt: new Date().toISOString(),
  contextScope: 'page',
  qualityScore: 0.9,
  wordCount: 80,
  plainText: [
    'Authentication uses API keys stored in the dashboard.',
    'Rate limits are 100 requests per minute for free plans.',
    'Webhooks deliver events to your HTTPS endpoint.',
  ].join('\n\n'),
  blocks: [
    {
      sourceBlockId: 'sb_auth',
      text: 'Authentication uses API keys stored in the dashboard.',
      tagName: 'p',
      locator: 'p:nth-of-type(1)',
      fingerprint: 'a1',
      order: 0,
    },
    {
      sourceBlockId: 'sb_rate',
      text: 'Rate limits are 100 requests per minute for free plans.',
      tagName: 'p',
      locator: 'p:nth-of-type(2)',
      fingerprint: 'a2',
      order: 1,
    },
    {
      sourceBlockId: 'sb_hooks',
      text: 'Webhooks deliver events to your HTTPS endpoint.',
      tagName: 'p',
      locator: 'p:nth-of-type(3)',
      fingerprint: 'a3',
      order: 2,
    },
  ],
};

describe('retrieveForQuestion', () => {
  it('returns citations for on-page questions', () => {
    const result = retrieveForQuestion(page, 'What is the rate limit?');
    expect(result.belowThreshold).toBe(false);
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations.some((c) => c.text.includes('Rate limits'))).toBe(true);
  });

  it('rejects low-confidence off-page questions', () => {
    const result = retrieveForQuestion(
      page,
      'What is the CEO birthday and favorite color?',
    );
    expect(result.confidence).toBeLessThanOrEqual(1);
    // Either below threshold or empty citations
    expect(result.belowThreshold || result.citations.length === 0).toBe(true);
  });

  it('exposes confidence threshold constant', () => {
    expect(CONFIDENCE_THRESHOLD).toBeGreaterThan(0);
  });
});

describe('retrieveSummaryCitations', () => {
  it('selects relevant article evidence instead of leading account navigation', () => {
    const summaryPage: ExtractedPage = {
      ...page,
      title: 'Nostalgia and society',
      plainText: [
        'My account My Classes My Account My List Sign Out',
        'Reflective nostalgia connects people to shared memories without rejecting the present.',
        'Restorative nostalgia can invent a golden age and strengthen divisive political myths.',
      ].join('\n\n'),
      blocks: [
        {
          sourceBlockId: 'nav_combined',
          text: 'My account My Classes My Account My List Sign Out',
          tagName: 'p',
          locator: '#account-menu',
          fingerprint: 'nav1',
          order: 0,
        },
        {
          sourceBlockId: 'nav_classes',
          text: 'My Classes',
          tagName: 'p',
          locator: '#my-classes',
          fingerprint: 'nav2',
          order: 1,
        },
        {
          sourceBlockId: 'article_heading',
          text: 'How nostalgia can endanger a society',
          tagName: 'h1',
          headingLevel: 1,
          locator: 'article > h1',
          fingerprint: 'heading',
          order: 2,
        },
        {
          sourceBlockId: 'reflective',
          text: 'Reflective nostalgia connects people to shared memories without rejecting the present.',
          tagName: 'p',
          locator: 'article > p:nth-of-type(1)',
          fingerprint: 'body1',
          order: 3,
        },
        {
          sourceBlockId: 'restorative',
          text: 'Restorative nostalgia can invent a golden age and strengthen divisive political myths.',
          tagName: 'p',
          locator: 'article > p:nth-of-type(2)',
          fingerprint: 'body2',
          order: 4,
        },
      ],
      wordCount: 35,
    };

    const citations = retrieveSummaryCitations(
      summaryPage,
      'Reflective nostalgia can unite people through memories. Restorative nostalgia may reject the present and fuel divisive political myths.',
    );

    expect(citations.map((citation) => citation.sourceBlockId)).toEqual(
      expect.arrayContaining(['reflective', 'restorative']),
    );
    expect(
      citations.some(
        (citation) =>
          citation.sourceBlockId.startsWith('nav_') ||
          citation.sourceBlockId === 'article_heading',
      ),
    ).toBe(false);
  });

  it('returns no sources when the summary has no reliable page evidence', () => {
    expect(
      retrieveSummaryCitations(
        page,
        'Quantum entanglement connects distant particles in laboratory experiments.',
      ),
    ).toEqual([]);
  });
});
