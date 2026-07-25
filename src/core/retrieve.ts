import type { ExtractedPage, SourceBlock, SourceCitation } from '@/shared/types';
import { chunkPage, type TextChunk } from './chunk';
import { isLikelyNavigationText } from './extract';

const CONFIDENCE_THRESHOLD = 0.08;
const MIN_RAW_SCORE = 0.35;
const MIN_SUMMARY_CITATION_SCORE = 0.35;
const MIN_SUMMARY_BLOCK_LENGTH = 32;

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'what',
  'which',
  'who',
  'whom',
  'this',
  'that',
  'these',
  'those',
  'and',
  'or',
  'of',
  'to',
  'in',
  'on',
  'for',
  'with',
  'as',
  'by',
  'at',
  'from',
  'it',
  'be',
  'do',
  'does',
  'did',
  'how',
  'why',
  'when',
  'where',
  'can',
  'could',
  'would',
  'should',
  'about',
  'into',
  'your',
  'my',
  'our',
  'their',
  'favorite',
  'colour',
  'color',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .flatMap((t) => {
      // light stemming so "limit" matches "limits"
      if (t.length > 3 && t.endsWith('s')) return [t, t.slice(0, -1)];
      return [t];
    });
}

/** Simplified BM25-ish scoring over page blocks/chunks. */
export function scoreChunks(
  query: string,
  chunks: TextChunk[],
): Array<{ chunk: TextChunk; score: number }> {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const df = new Map<string, number>();
  const docs = chunks.map((c) => tokenize(c.text));
  for (const tokens of docs) {
    const unique = new Set(tokens);
    for (const t of unique) {
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }

  const N = chunks.length || 1;
  const avgLen = docs.reduce((s, d) => s + d.length, 0) / N;
  const k1 = 1.2;
  const b = 0.75;

  return chunks.map((chunk, i) => {
    const tokens = docs[i] ?? [];
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

    let score = 0;
    // Heading boost
    const headingBoost = chunk.headingPath.some((h) =>
      queryTokens.some((q) => h.toLowerCase().includes(q)),
    )
      ? 0.15
      : 0;

    for (const q of queryTokens) {
      const f = tf.get(q) ?? 0;
      if (f === 0) continue;
      const n = df.get(q) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      const denom = f + k1 * (1 - b + b * (tokens.length / (avgLen || 1)));
      score += idf * ((f * (k1 + 1)) / denom);
    }
    return { chunk, score: score + headingBoost };
  });
}

export interface RetrievalResult {
  citations: SourceCitation[];
  contextText: string;
  confidence: number;
  belowThreshold: boolean;
}

export function retrieveForQuestion(
  page: ExtractedPage,
  question: string,
  topK = 4,
): RetrievalResult {
  const chunks = chunkPage(page, 800);
  const scored = scoreChunks(question, chunks)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const maxScore = scored[0]?.score ?? 0;
  const confidence =
    maxScore >= MIN_RAW_SCORE ? Math.min(1, maxScore / (maxScore + 1.5)) : 0;

  const blockMap = new Map(page.blocks.map((b) => [b.sourceBlockId, b]));
  const citations: SourceCitation[] = [];

  for (const { chunk, score } of scored) {
    for (const id of chunk.sourceBlockIds.slice(0, 2)) {
      const block = blockMap.get(id);
      if (!block) continue;
      if (citations.some((c) => c.sourceBlockId === id)) continue;
      citations.push(blockToCitation(block, score));
      if (citations.length >= 3) break;
    }
    if (citations.length >= 3) break;
  }

  // Ensure citations are verifiable substrings of page text
  const verified = citations.filter((c) =>
    page.plainText.includes(c.text.slice(0, Math.min(80, c.text.length))),
  );

  const contextText = scored.map((s) => s.chunk.text).join('\n\n---\n\n');

  return {
    citations: verified.slice(0, 3),
    contextText,
    confidence,
    belowThreshold:
      maxScore < MIN_RAW_SCORE ||
      confidence < CONFIDENCE_THRESHOLD ||
      verified.length === 0,
  };
}

/**
 * Select summary evidence from individual source blocks. Scoring whole chunks
 * can attach an unrelated menu block that happened to precede relevant prose.
 * If no block is meaningfully related, return no citation instead of noise.
 */
export function retrieveSummaryCitations(
  page: ExtractedPage,
  summary: string,
  topK = 3,
): SourceCitation[] {
  const candidateBlocks = page.blocks.filter(
    (block) =>
      block.headingLevel === undefined &&
      block.text.trim().length >= MIN_SUMMARY_BLOCK_LENGTH &&
      !isLikelyNavigationText(block.text),
  );
  const blockMap = new Map(candidateBlocks.map((block) => [block.sourceBlockId, block]));
  const blockChunks: TextChunk[] = candidateBlocks.map((block) => ({
    chunkId: `citation_${block.sourceBlockId}`,
    text: block.text,
    sourceBlockIds: [block.sourceBlockId],
    headingPath: [],
    estimatedTokens: Math.ceil(block.text.length / 4),
  }));

  return scoreChunks(summary, blockChunks)
    .filter(({ score }) => score >= MIN_SUMMARY_CITATION_SCORE)
    .sort((a, b) => b.score - a.score)
    .flatMap(({ chunk, score }) => {
      const block = blockMap.get(chunk.sourceBlockIds[0] ?? '');
      if (!block) return [];
      if (
        !page.plainText.includes(block.text.slice(0, Math.min(80, block.text.length)))
      ) {
        return [];
      }
      return [blockToCitation(block, score)];
    })
    .slice(0, topK);
}

function blockToCitation(block: SourceBlock, score: number): SourceCitation {
  return {
    sourceBlockId: block.sourceBlockId,
    text: block.text.slice(0, 400),
    locator: block.locator,
    score,
  };
}

export { CONFIDENCE_THRESHOLD };
