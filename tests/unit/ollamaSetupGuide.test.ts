import { describe, expect, it } from 'vitest';
import { OLLAMA_STARTER_MODELS } from '@/providers/modelRecommendation';
import { getOllamaSetupGuideUrl } from '@/sidepanel/components/OllamaSetupGuide';

describe('Ollama setup guidance', () => {
  it.each([
    ['en', 'https://craighsieh.github.io/VerityRead/setup/'],
    ['zh_TW', 'https://craighsieh.github.io/VerityRead/setup/zh-TW/'],
    ['zh_CN', 'https://craighsieh.github.io/VerityRead/setup/zh-CN/'],
    ['ja', 'https://craighsieh.github.io/VerityRead/setup/ja/'],
    ['ko', 'https://craighsieh.github.io/VerityRead/setup/ko/'],
  ] as const)('routes %s users to the matching public guide', (locale, expected) => {
    expect(getOllamaSetupGuideUrl(locale)).toBe(expected);
  });

  it('keeps the documented starter models and sizes in one source of truth', () => {
    expect(OLLAMA_STARTER_MODELS).toEqual([
      {
        name: 'gemma4:e4b',
        approximateDownloadGb: 9.6,
        profile: 'quality',
      },
      {
        name: 'gemma4:e2b',
        approximateDownloadGb: 7.2,
        profile: 'lighter',
      },
    ]);
  });
});
