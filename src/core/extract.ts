import { Readability } from '@mozilla/readability';
import { createAppError } from '@/shared/errors';
import type { ContextScope, ExtractedPage, SourceBlock } from '@/shared/types';
import { buildSourceBlockId, cssPath, fingerprintText } from './fingerprint';
import { t } from '@/i18n';

const PROTECTED_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'devtools://',
  'https://chrome.google.com/webstore',
  'https://chromewebstore.google.com',
];

const NOISE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'nav',
  'footer',
  'header',
  'aside',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '.cookie',
  '#cookie',
  '.cookie-banner',
  '.ads',
  '.advertisement',
  '[aria-hidden="true"]',
];

const NAVIGATION_LABELS = [
  'my account',
  'my classes',
  'my list',
  'sign out',
  'sign in',
  'log in',
  'login',
  'register',
  'membership',
  'account',
  'profile',
] as const;

const CONTENT_BLOCK_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,li,pre,blockquote,td,th';

/**
 * Some publisher menus live inside <main> and survive selector-based cleanup.
 * Keep this conservative: exact short UI labels are noise, while combined text
 * is rejected only when it contains multiple navigation actions.
 */
export function isLikelyNavigationText(text: string): boolean {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!normalized) return true;

  if (NAVIGATION_LABELS.includes(normalized as (typeof NAVIGATION_LABELS)[number])) {
    return true;
  }

  const labelMatches = NAVIGATION_LABELS.filter((label) =>
    normalized.includes(label),
  ).length;
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  return wordCount <= 24 && labelMatches >= 2;
}

export function isProtectedUrl(url: string): boolean {
  return PROTECTED_PREFIXES.some((p) => url.startsWith(p));
}

function isVisible(el: Element): boolean {
  const html = el as HTMLElement;
  if (html.hidden) return false;
  const style = window.getComputedStyle(html);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (parseFloat(style.opacity || '1') === 0) return false;
  return true;
}

function headingLevel(tag: string): number | undefined {
  const m = /^h([1-6])$/i.exec(tag);
  return m ? Number(m[1]) : undefined;
}

function normalizedText(root: Element): string {
  return (root.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function longestVisibleElement(elements: Element[]): Element | null {
  return (
    elements
      .filter(isVisible)
      .sort((a, b) => normalizedText(b).length - normalizedText(a).length)[0] ?? null
  );
}

/**
 * Prefer the live article tree so citations retain working DOM locators.
 * Readability text guards against selecting a short related-content card.
 */
function findPrimaryContentRoot(doc: Document, readabilityText: string): Element | null {
  const minimumLength = readabilityText
    ? Math.min(600, Math.max(120, readabilityText.length * 0.25))
    : 120;
  const article = longestVisibleElement([...doc.querySelectorAll('article')]);
  if (article && normalizedText(article).length >= minimumLength) {
    return article;
  }

  const main = longestVisibleElement([...doc.querySelectorAll('main, [role="main"]')]);
  if (main && normalizedText(main).length >= minimumLength) {
    return main;
  }
  return null;
}

function collectBlocks(root: Document | Element): SourceBlock[] {
  const blocks: SourceBlock[] = [];
  const nodes = root.querySelectorAll(CONTENT_BLOCK_SELECTOR);
  let order = 0;

  for (const node of nodes) {
    if (!isVisible(node)) continue;
    if (NOISE_SELECTORS.some((s) => node.matches(s) || node.closest(s))) continue;

    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (text.length < 2) continue;
    if (isLikelyNavigationText(text)) continue;

    const locator = cssPath(node);
    const fingerprint = fingerprintText(text);
    const tagName = node.tagName.toLowerCase();
    blocks.push({
      sourceBlockId: buildSourceBlockId(locator, fingerprint),
      text,
      tagName,
      headingLevel: headingLevel(tagName),
      locator,
      fingerprint,
      order: order++,
    });
  }
  return blocks;
}

function syntheticReadabilityBlocks(articleText: string): SourceBlock[] {
  return articleText
    .split(/\n+/)
    .map((text) => text.replace(/\s+/g, ' ').trim())
    .filter((text) => text.length > 20 && !isLikelyNavigationText(text))
    .map((text, order) => {
      const fingerprint = fingerprintText(text);
      const locator = `synthetic:p${order}`;
      return {
        sourceBlockId: buildSourceBlockId(locator, fingerprint),
        text,
        tagName: 'p',
        locator,
        fingerprint,
        order,
      };
    });
}

function scoreQuality(blocks: SourceBlock[], wordCount: number): number {
  if (wordCount < 30) return 0.1;
  if (blocks.length < 3) return 0.3;
  if (wordCount < 80) return 0.5;
  if (blocks.some((b) => b.headingLevel)) return 0.9;
  return 0.75;
}

/**
 * Extract main content from the current document.
 * Must only run after explicit user action (activeTab).
 * Returns structured plain text — never raw HTML/DOM.
 */
export function extractFromDocument(doc: Document = document): ExtractedPage {
  const url = doc.location?.href ?? location.href;
  if (isProtectedUrl(url)) {
    throw createAppError('PAGE_PROTECTED');
  }

  // Clone and strip noise before Readability
  const clone = doc.cloneNode(true) as Document;
  for (const sel of NOISE_SELECTORS) {
    clone.querySelectorAll(sel).forEach((el) => el.remove());
  }

  let articleTitle = doc.title;
  let articleText = '';
  try {
    const reader = new Readability(clone);
    const article = reader.parse();
    if (article) {
      articleTitle = article.title || articleTitle;
      articleText = article.textContent ?? '';
    }
  } catch {
    // fallback to block collection only
  }

  // Whole-body extraction pulls navigation, account menus, and related cards
  // into prompts. Prefer the live article tree and only fall back to body when
  // neither semantic roots nor Readability can provide enough content.
  const primaryRoot = findPrimaryContentRoot(doc, articleText);
  let blocks = primaryRoot ? collectBlocks(primaryRoot) : [];
  if (blocks.length < 3 && articleText) {
    blocks = syntheticReadabilityBlocks(articleText);
  }
  if (blocks.length < 3) {
    blocks = collectBlocks(doc.body ?? doc);
  }

  const plainText =
    blocks.map((b) => b.text).join('\n\n') || articleText.replace(/\s+/g, ' ').trim();
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const qualityScore = scoreQuality(blocks, wordCount);

  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = '';
  }

  return {
    title: articleTitle,
    url,
    domain,
    extractedAt: new Date().toISOString(),
    contextScope: 'page',
    blocks,
    plainText,
    qualityScore,
    wordCount,
  };
}

function scopedPage(
  page: ExtractedPage,
  contextScope: ContextScope,
  blocks: SourceBlock[],
): ExtractedPage {
  const normalizedBlocks = blocks.map((block, order) => ({ ...block, order }));
  const plainText = normalizedBlocks.map((block) => block.text).join('\n\n');
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  return {
    ...page,
    contextScope,
    blocks: normalizedBlocks,
    plainText,
    wordCount,
    qualityScore: scoreQuality(normalizedBlocks, wordCount),
  };
}

function selectedBlock(page: ExtractedPage, text: string, locator?: string): SourceBlock {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const matchingBlock = page.blocks.find(
    (block) =>
      block.text.includes(normalized.slice(0, Math.min(80, normalized.length))) ||
      normalized.includes(block.text.slice(0, Math.min(80, block.text.length))),
  );
  const resolvedLocator = locator || matchingBlock?.locator || 'synthetic:selection';
  const fingerprint = fingerprintText(normalized);
  return {
    sourceBlockId: buildSourceBlockId(resolvedLocator, fingerprint),
    text: normalized,
    tagName: matchingBlock?.tagName ?? 'selection',
    locator: resolvedLocator,
    fingerprint,
    order: 0,
  };
}

function sectionBlocks(page: ExtractedPage, anchorOrder?: number): SourceBlock[] {
  if (!page.blocks.length) return [];
  const ordered = [...page.blocks].sort((a, b) => a.order - b.order);
  const requestedIndex = ordered.findIndex((block) => block.order === anchorOrder);
  const anchorIndex =
    requestedIndex >= 0
      ? requestedIndex
      : Math.max(
          0,
          ordered.findIndex((block) => !block.headingLevel),
        );

  let headingIndex = anchorIndex;
  while (headingIndex >= 0 && !ordered[headingIndex]?.headingLevel) {
    headingIndex -= 1;
  }

  if (headingIndex < 0) {
    return ordered.slice(Math.max(0, anchorIndex - 1), anchorIndex + 3);
  }

  const headingLevel = ordered[headingIndex]?.headingLevel ?? 6;
  let endIndex = ordered.length;
  for (let index = headingIndex + 1; index < ordered.length; index += 1) {
    const candidateLevel = ordered[index]?.headingLevel;
    if (candidateLevel && candidateLevel <= headingLevel) {
      endIndex = index;
      break;
    }
  }

  // Current-section requests should stay fast on small local models.
  return ordered.slice(headingIndex, Math.min(endIndex, headingIndex + 12));
}

function currentVisibleBlockOrder(
  doc: Document,
  page: ExtractedPage,
): number | undefined {
  const viewportHeight = doc.defaultView?.innerHeight ?? 0;
  if (!viewportHeight) return undefined;
  const readingLine = viewportHeight * 0.38;
  let best: { order: number; distance: number } | undefined;

  for (const block of page.blocks) {
    if (block.locator.startsWith('synthetic:')) continue;
    let element: Element | null = null;
    try {
      element = doc.querySelector(block.locator);
    } catch {
      element = null;
    }
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > viewportHeight) continue;
    const distance = Math.abs((rect.top + rect.bottom) / 2 - readingLine);
    if (!best || distance < best.distance) {
      best = { order: block.order, distance };
    }
  }
  return best?.order;
}

function selectionLocator(doc: Document): string | undefined {
  const selection = doc.defaultView?.getSelection();
  const node = selection?.anchorNode;
  if (!node) return undefined;
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : (node.parentElement ?? undefined);
  const blockElement = element?.closest(CONTENT_BLOCK_SELECTOR) ?? element;
  return blockElement ? cssPath(blockElement) : undefined;
}

/**
 * Limit an already-sanitized page extract to the user-selected reading scope.
 * This preserves source locators while ensuring selection requests do not send
 * surrounding paragraphs the user did not choose.
 */
export function scopeExtractedPage(
  page: ExtractedPage,
  scope: ContextScope,
  options?: {
    selectionText?: string;
    selectionLocator?: string;
    anchorOrder?: number;
  },
): ExtractedPage {
  if (scope === 'page') return { ...page, contextScope: 'page' };
  if (scope === 'selection') {
    const selectionText = options?.selectionText?.trim() ?? '';
    if (!selectionText) {
      throw createAppError('CONTENT_INSUFFICIENT', {
        message: t('noSelection'),
        impact: t('noSelectionImpact'),
        nextSteps: [t('noSelectionStep')],
      });
    }
    return scopedPage(page, scope, [
      selectedBlock(page, selectionText, options?.selectionLocator),
    ]);
  }
  return scopedPage(page, scope, sectionBlocks(page, options?.anchorOrder));
}

export function extractContextFromDocument(
  doc: Document,
  scope: ContextScope,
  selectionTextOverride?: string,
): ExtractedPage {
  const page = extractFromDocument(doc);
  if (scope === 'selection') {
    return scopeExtractedPage(page, scope, {
      selectionText:
        selectionTextOverride ?? doc.defaultView?.getSelection()?.toString() ?? '',
      selectionLocator: selectionLocator(doc),
    });
  }
  if (scope === 'section') {
    return scopeExtractedPage(page, scope, {
      anchorOrder: currentVisibleBlockOrder(doc, page),
    });
  }
  return page;
}

export const QUALITY_THRESHOLD = 0.4;

export function assertExtractQuality(page: ExtractedPage): void {
  if (page.contextScope === 'selection') {
    if (page.plainText.trim().length < 2) {
      throw createAppError('CONTENT_INSUFFICIENT');
    }
    return;
  }
  if (page.contextScope === 'section') {
    if (page.wordCount < 5 || page.blocks.length === 0) {
      throw createAppError('CONTENT_INSUFFICIENT');
    }
    return;
  }
  if (page.wordCount < 20 || page.qualityScore < QUALITY_THRESHOLD) {
    throw createAppError(
      page.wordCount < 20 ? 'CONTENT_INSUFFICIENT' : 'EXTRACT_QUALITY_LOW',
    );
  }
}
