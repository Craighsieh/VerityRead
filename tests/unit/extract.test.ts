import { afterEach, describe, expect, it } from 'vitest';
import {
  assertExtractQuality,
  extractFromDocument,
  isProtectedUrl,
  QUALITY_THRESHOLD,
  scopeExtractedPage,
} from '@/core/extract';
import { fingerprintText, buildSourceBlockId } from '@/core/fingerprint';

afterEach(() => {
  document.title = '';
  document.body.innerHTML = '';
});

describe('isProtectedUrl', () => {
  it('blocks chrome and web store urls', () => {
    expect(isProtectedUrl('chrome://settings')).toBe(true);
    expect(isProtectedUrl('https://chrome.google.com/webstore/detail/x')).toBe(true);
    expect(isProtectedUrl('https://chromewebstore.google.com/detail/x')).toBe(true);
  });

  it('allows normal pages', () => {
    expect(isProtectedUrl('https://github.com/org/repo')).toBe(false);
    expect(isProtectedUrl('https://example.com/article')).toBe(false);
  });
});

describe('fingerprint + sourceBlockId', () => {
  it('is stable for same text', () => {
    const a = fingerprintText('Hello world');
    const b = fingerprintText('Hello   world');
    expect(a).toBe(b);
    expect(buildSourceBlockId('p:nth-of-type(1)', a)).toContain(a);
  });
});

describe('QUALITY_THRESHOLD', () => {
  it('is defined', () => {
    expect(QUALITY_THRESHOLD).toBeGreaterThan(0);
  });
});

describe('extractFromDocument', () => {
  it('prefers the primary article over whole-page navigation and related cards', () => {
    document.title = 'Focused article';
    document.body.innerHTML = `
      <nav>
        <p>My Account Membership Sign Out Business Early Releases</p>
      </nav>
      <main>
        <article>
          <h1>How local inference should work</h1>
          <p>
            VaultLens should extract the article itself before asking a local model
            to summarize it. This paragraph contains the core claim and enough
            explanatory detail to represent meaningful editorial content.
          </p>
          <p>
            Semantic article boundaries reduce irrelevant prompts, unnecessary
            token usage, and repeated map-reduce calls while preserving citations.
          </p>
        </article>
        <section>
          <h2>Recommended stories</h2>
          <p>Unrelated teaser content should not enter the summary prompt.</p>
        </section>
      </main>
      <footer><p>Privacy Terms Newsletter</p></footer>
    `;

    const page = extractFromDocument(document);

    expect(page.contextScope).toBe('page');
    expect(page.plainText).toContain('How local inference should work');
    expect(page.plainText).toContain('Semantic article boundaries');
    expect(page.plainText).not.toContain('My Account Membership');
    expect(page.plainText).not.toContain('Recommended stories');
    expect(page.blocks).toHaveLength(3);
    expect(page.blocks.every((block) => !block.locator.startsWith('synthetic:'))).toBe(
      true,
    );
  });

  it('removes account navigation embedded inside the main content container', () => {
    document.title = 'Publisher article';
    document.body.innerHTML = `
      <main>
        <div class="account-actions">
          <p>My account My Classes My Account My List Sign Out</p>
          <p>My Classes</p>
          <p>My Account</p>
        </div>
        <h1>Why nostalgia can divide a society</h1>
        <p>
          Reflective nostalgia helps people revisit shared memories without
          rejecting the present or inventing a perfect lost world.
        </p>
        <p>
          Restorative nostalgia can turn an imagined golden age into a political
          demand that excludes people associated with social change.
        </p>
      </main>
    `;

    const page = extractFromDocument(document);

    expect(page.plainText).toContain('Reflective nostalgia');
    expect(page.plainText).toContain('Restorative nostalgia');
    expect(page.plainText).not.toContain('My account');
    expect(page.plainText).not.toContain('My Classes');
    expect(page.blocks.map((block) => block.text)).toEqual([
      'Why nostalgia can divide a society',
      expect.stringContaining('Reflective nostalgia'),
      expect.stringContaining('Restorative nostalgia'),
    ]);
  });

  it('sends only the highlighted text for selected-text context', () => {
    document.title = 'Selection test';
    document.body.innerHTML = `
      <article>
        <h1>Local reading</h1>
        <p>The first paragraph should stay outside the request.</p>
        <p>The selected claim needs a careful explanation for the reader.</p>
      </article>
    `;
    const page = extractFromDocument(document);
    const selected = scopeExtractedPage(page, 'selection', {
      selectionText: 'The selected claim needs a careful explanation',
    });

    expect(selected.contextScope).toBe('selection');
    expect(selected.plainText).toBe('The selected claim needs a careful explanation');
    expect(selected.plainText).not.toContain('first paragraph');
    expect(selected.blocks).toHaveLength(1);
    expect(() => assertExtractQuality(selected)).not.toThrow();
  });

  it('keeps the nearest heading section and stops at the next peer heading', () => {
    document.title = 'Section test';
    document.body.innerHTML = `
      <article>
        <h1>Guide</h1>
        <h2>First section</h2>
        <p>First section body with enough words for extraction.</p>
        <h2>Second section</h2>
        <p>Second section first paragraph with the answer.</p>
        <p>Second section second paragraph with supporting context.</p>
        <h2>Third section</h2>
        <p>Third section body should not be included.</p>
      </article>
    `;
    const page = extractFromDocument(document);
    const anchor = page.blocks.find((block) =>
      block.text.startsWith('Second section first paragraph'),
    );
    const section = scopeExtractedPage(page, 'section', {
      anchorOrder: anchor?.order,
    });

    expect(section.contextScope).toBe('section');
    expect(section.plainText).toContain('Second section');
    expect(section.plainText).toContain('supporting context');
    expect(section.plainText).not.toContain('First section body');
    expect(section.plainText).not.toContain('Third section body');
    expect(() => assertExtractQuality(section)).not.toThrow();
  });
});
