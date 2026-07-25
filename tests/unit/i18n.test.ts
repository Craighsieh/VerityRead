import { describe, expect, it } from 'vitest';
import { productName, resolveLocale, t } from '@/i18n';

describe('runtime localization', () => {
  it.each([
    ['en-US', 'en'],
    ['zh-TW', 'zh_TW'],
    ['zh-Hant-HK', 'zh_TW'],
    ['zh-CN', 'zh_CN'],
    ['zh-Hans', 'zh_CN'],
    ['ja-JP', 'ja'],
    ['ko-KR', 'ko'],
  ] as const)('maps %s to %s', (rawLocale, expected) => {
    expect(resolveLocale(rawLocale)).toBe(expected);
  });

  it('uses the approved product names', () => {
    expect(productName('en')).toBe('VerityRead');
    expect(productName('zh_TW')).toBe('真閱');
    expect(productName('zh_CN')).toBe('真阅');
    expect(productName('ja')).toBe('VerityRead');
    expect(productName('ko')).toBe('VerityRead');
  });

  it('interpolates localized placeholders without leaving template tokens', () => {
    for (const locale of ['en', 'zh_TW', 'zh_CN', 'ja', 'ko'] as const) {
      const message = t('contextAttached', { domain: 'example.com', scope: 'page' }, locale);
      expect(message).toContain('example.com');
      expect(message).not.toMatch(/\{(?:domain|scope)\}/);
    }
  });
});
