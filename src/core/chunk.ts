import type { ExtractedPage, SourceBlock } from '@/shared/types';

export interface TextChunk {
  chunkId: string;
  text: string;
  sourceBlockIds: string[];
  headingPath: string[];
  estimatedTokens: number;
}

/** Rough token estimate: ~4 chars per token for mixed EN/CJK. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Chunk by heading hierarchy + token budget.
 * Blocks map 1:1 into chunks when small; large blocks are split.
 */
export function chunkPage(
  page: ExtractedPage,
  tokenBudget = 1200,
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let currentBlocks: SourceBlock[] = [];
  let currentTokens = 0;
  let headingPath: string[] = [];
  let chunkIndex = 0;

  const flush = () => {
    if (currentBlocks.length === 0) return;
    const text = currentBlocks.map((b) => b.text).join('\n\n');
    chunks.push({
      chunkId: `chunk_${chunkIndex++}`,
      text,
      sourceBlockIds: currentBlocks.map((b) => b.sourceBlockId),
      headingPath: [...headingPath],
      estimatedTokens: estimateTokens(text),
    });
    currentBlocks = [];
    currentTokens = 0;
  };

  for (const block of page.blocks) {
    if (block.headingLevel) {
      flush();
      headingPath = headingPath.slice(0, block.headingLevel - 1);
      headingPath.push(block.text);
    }

    const blockTokens = estimateTokens(block.text);
    if (blockTokens > tokenBudget) {
      flush();
      // Split oversized block by sentences
      const parts = splitByBudget(block.text, tokenBudget);
      for (const part of parts) {
        chunks.push({
          chunkId: `chunk_${chunkIndex++}`,
          text: part,
          sourceBlockIds: [block.sourceBlockId],
          headingPath: [...headingPath],
          estimatedTokens: estimateTokens(part),
        });
      }
      continue;
    }

    if (currentTokens + blockTokens > tokenBudget) {
      flush();
    }
    currentBlocks.push(block);
    currentTokens += blockTokens;
  }
  flush();
  return chunks;
}

function splitByBudget(text: string, budget: number): string[] {
  const sentences = text.split(/(?<=[.!?。！？\n])\s+/).filter(Boolean);
  const units =
    sentences.length <= 1
      ? text.split(/\s+/).filter(Boolean) // fall back to words when no sentence breaks
      : sentences;
  const parts: string[] = [];
  let current = '';
  for (const unit of units) {
    const next = current ? `${current} ${unit}` : unit;
    if (estimateTokens(next) > budget && current) {
      parts.push(current.trim());
      current = unit;
    } else {
      current = next;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.length > 0 ? parts : [text];
}

/**
 * Map-reduce summarization plan for content exceeding context.
 * Returns chunk groups that should be summarized then merged.
 * Never silently truncates key paragraphs.
 */
export function planMapReduce(
  page: ExtractedPage,
  contextTokens: number,
): { needsMapReduce: boolean; chunks: TextChunk[] } {
  const usable = Math.max(512, Math.floor(contextTokens * 0.6));
  const chunks = chunkPage(page, Math.min(1200, usable));
  const total = chunks.reduce((sum, c) => sum + c.estimatedTokens, 0);
  return {
    needsMapReduce: total > usable,
    chunks,
  };
}
