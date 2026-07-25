export interface BilingualPair {
  source: string;
  target: string;
}

export interface BilingualContent {
  pairs: BilingualPair[];
  aligned: boolean;
}

export const TARGET_LANGUAGE_OPTIONS = [
  { value: 'zh-Hant', label: '繁體中文' },
  { value: 'zh-Hans', label: '简体中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
] as const;

const MAX_BILINGUAL_SEGMENTS = 12;
const SENTENCE_PATTERN = /[^.!?。！？]+(?:[.!?。！？]+|$)/g;

function splitLineIntoSentences(line: string): string[] {
  const matches = line.match(SENTENCE_PATTERN);
  return (matches ?? [line]).map((part) => part.trim()).filter(Boolean);
}

/**
 * Keep headings and list items intact, but make prose sentence-addressable so
 * the UI can render source then translation in a predictable reading order.
 */
export function segmentForBilingual(text: string): string[] {
  const lines = text
    .replace(/\r/g, '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const segments = lines.flatMap((line) => {
    if (/^(?:[-*•]|\d+[.)]|#{1,6}\s)/.test(line)) return [line];
    return splitLineIntoSentences(line);
  });

  if (segments.length <= MAX_BILINGUAL_SEGMENTS) return segments;
  return [
    ...segments.slice(0, MAX_BILINGUAL_SEGMENTS - 1),
    segments.slice(MAX_BILINGUAL_SEGMENTS - 1).join(' '),
  ];
}

export function pairBilingualText(
  sourceText: string,
  translatedText: string,
): BilingualContent {
  const sourceSegments = segmentForBilingual(sourceText);
  const targetSegments = segmentForBilingual(translatedText);

  if (sourceSegments.length > 0 && sourceSegments.length === targetSegments.length) {
    return {
      aligned: true,
      pairs: sourceSegments.map((source, index) => ({
        source,
        target: targetSegments[index] ?? '',
      })),
    };
  }

  return {
    aligned: false,
    pairs: [
      {
        source: sourceText.trim(),
        target: translatedText.trim(),
      },
    ],
  };
}

export function getTargetLanguageLabel(targetLanguage: string): string {
  return (
    TARGET_LANGUAGE_OPTIONS.find((option) => option.value === targetLanguage)?.label ??
    targetLanguage
  );
}
