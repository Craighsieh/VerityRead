/**
 * Development-only Japanese/Korean language QA through Anthropic.
 *
 * Sends only public UI/listing/privacy/setup copy. It is not bundled into the
 * extension and never receives user page content.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { messageKeys, t, type SupportedLocale } from '@/i18n';
import { OLLAMA_STARTER_MODELS } from '@/providers/modelRecommendation';

interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

interface AnthropicResponse {
  id: string;
  model: string;
  content: AnthropicTextBlock[];
  stop_reason?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

interface QaIssue {
  source: string;
  key?: string;
  severity: 'blocker' | 'major' | 'minor';
  current: string;
  suggested: string;
  reason: string;
}

interface QaResult {
  locale: 'ja' | 'ko';
  verdict: 'pass' | 'needs_changes';
  summary: string;
  issues: QaIssue[];
}

const ROOT = process.cwd();
const OUTPUT_PATH = resolve(ROOT, 'docs/qa/anthropic-ja-ko.json');
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';
const QA_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    locale: { type: 'string', enum: ['ja', 'ko'] },
    verdict: { type: 'string', enum: ['pass', 'needs_changes'] },
    summary: { type: 'string' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            enum: ['runtime', 'manifest', 'storeListing', 'privacyPolicy', 'setupGuide'],
          },
          key: {
            type: 'string',
            description: 'Runtime message key, or an empty string for other sources.',
          },
          severity: {
            type: 'string',
            enum: ['blocker', 'major', 'minor'],
          },
          current: { type: 'string' },
          suggested: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['source', 'key', 'severity', 'current', 'suggested', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['locale', 'verdict', 'summary', 'issues'],
  additionalProperties: false,
} as const;

async function loadLocalEnvironment(): Promise<void> {
  try {
    const contents = await readFile(resolve(ROOT, '.env.local'), 'utf8');
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const separator = line.indexOf('=');
      if (separator <= 0) continue;
      const key = line.slice(0, separator).trim();
      const value = line
        .slice(separator + 1)
        .trim()
        .replace(/^(['"])(.*)\1$/, '$2');
      process.env[key] ??= value;
    }
  } catch {
    // Environment variables remain the preferred secret source.
  }
}

function runtimeCopy(locale: SupportedLocale): Record<string, string> {
  return Object.fromEntries(messageKeys.map((key) => [key, t(key, {}, locale)]));
}

async function sourceBundle(locale: 'ja' | 'ko'): Promise<Record<string, unknown>> {
  const privacyFilename = locale === 'ja' ? 'ja.md' : 'ko.md';
  const [manifest, listing, privacy, setupGuide] = await Promise.all([
    readFile(resolve(ROOT, `public/_locales/${locale}/messages.json`), 'utf8'),
    readFile(resolve(ROOT, 'docs/store/LISTING.md'), 'utf8'),
    readFile(resolve(ROOT, `docs/privacy/${privacyFilename}`), 'utf8'),
    readFile(resolve(ROOT, `docs/setup/${privacyFilename}`), 'utf8'),
  ]);
  const listingHeading = locale === 'ja' ? '## 日本語 (`ja`)' : '## 한국어 (`ko`)';
  const listingStart = listing.indexOf(listingHeading);
  if (listingStart < 0) throw new Error(`Missing ${locale} store listing section`);
  const listingEnd = listing.indexOf('\n## ', listingStart + listingHeading.length);

  return {
    locale,
    setupFacts: {
      checkedAt: '2026-07-26',
      source: 'https://ollama.com/library/gemma4',
      models: OLLAMA_STARTER_MODELS,
    },
    runtime: runtimeCopy(locale),
    manifest: JSON.parse(manifest),
    storeListing: listing.slice(
      listingStart,
      listingEnd < 0 ? listing.length : listingEnd,
    ),
    privacyPolicy: privacy,
    setupGuide,
  };
}

async function reviewLocale(
  apiKey: string,
  locale: 'ja' | 'ko',
): Promise<{ responseId: string; model: string; result: QaResult; usage?: unknown }> {
  const bundle = await sourceBundle(locale);
  const language = locale === 'ja' ? 'Japanese' : 'Korean';
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 12000,
      thinking: { type: 'disabled' },
      output_config: {
        format: {
          type: 'json_schema',
          schema: QA_OUTPUT_SCHEMA,
        },
      },
      system:
        `You are a senior native ${language} product localization reviewer. ` +
        'Review Chrome-extension UI, store listing, privacy copy, and setup instructions for grammar, naturalness, clarity, consistent terminology, and product-policy accuracy. ' +
        'Use blocker only for dangerous or unusable copy. Use major only when copy materially changes meaning, misrepresents privacy or product capabilities, or prevents a user from completing a task. ' +
        'Classify tone, word order, terminology refinement, and non-blocking ambiguity as minor. Do not report strings that need no change. ' +
        'Do not translate product names, API names, Provider, Chrome Built-in AI, Ollama, URLs, code, or {placeholder} tokens. ' +
        'Treat setupFacts as the source of truth for starter model names and sizes; runtime {size} placeholders are populated from those same values. ' +
        'Treat this as AI-assisted linguistic QA, not legal advice.',
      messages: [
        {
          role: 'user',
          content:
            'Review the following public copy. Report at most 20 distinct, highest-priority issues. ' +
            'Use an empty key for non-runtime sources. Use pass only when there are no blocker or major issues. ' +
            'Minor stylistic suggestions may remain.\n\n' +
            JSON.stringify(bundle),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${detail.slice(0, 500)}`);
  }
  const data = (await response.json()) as AnthropicResponse;
  const text = data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
  if (!text) {
    throw new Error(
      `Anthropic returned no text for ${locale}; stop_reason=${data.stop_reason ?? 'unknown'}.`,
    );
  }
  return {
    responseId: data.id,
    model: data.model,
    result: JSON.parse(text) as QaResult,
    usage: data.usage,
  };
}

await loadLocalEnvironment();
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error(
    'ANTHROPIC_API_KEY is missing. Set it in the environment or ignored .env.local.',
  );
}

const reviews = [];
for (const locale of ['ja', 'ko'] as const) {
  reviews.push(await reviewLocale(apiKey, locale));
}

await mkdir(resolve(ROOT, 'docs/qa'), { recursive: true });
await writeFile(
  OUTPUT_PATH,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      requestedModel: MODEL,
      disclosure:
        'AI-assisted language QA only; no page content or user data was submitted.',
      reviews,
    },
    null,
    2,
  )}\n`,
  'utf8',
);

const majorIssues = reviews.flatMap((review) =>
  review.result.issues.filter(
    (issue) => issue.severity === 'blocker' || issue.severity === 'major',
  ),
);
if (majorIssues.length > 0) {
  throw new Error(
    `Anthropic locale QA found ${majorIssues.length} blocker/major issue(s). See ${OUTPUT_PATH}.`,
  );
}
