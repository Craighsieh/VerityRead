import { describe, expect, it } from 'vitest';
import {
  getTargetLanguageLabel,
  pairBilingualText,
  segmentForBilingual,
} from '@/sidepanel/chat';

describe('bilingual chat helpers', () => {
  it('segments prose while preserving list items', () => {
    expect(
      segmentForBilingual('First sentence. Second sentence!\n- Keep this item whole.'),
    ).toEqual(['First sentence.', 'Second sentence!', '- Keep this item whole.']);
  });

  it('pairs source and translation when segment counts match', () => {
    expect(pairBilingualText('Hello.\nGoodbye.', '你好。\n再見。')).toEqual({
      aligned: true,
      pairs: [
        { source: 'Hello.', target: '你好。' },
        { source: 'Goodbye.', target: '再見。' },
      ],
    });
  });

  it('falls back to two complete blocks when alignment is uncertain', () => {
    expect(pairBilingualText('One. Two.', '合併翻譯')).toEqual({
      aligned: false,
      pairs: [{ source: 'One. Two.', target: '合併翻譯' }],
    });
  });

  it('provides a readable label for the selected target language', () => {
    expect(getTargetLanguageLabel('zh-Hant')).toBe('繁體中文');
    expect(getTargetLanguageLabel('xx')).toBe('xx');
  });
});
