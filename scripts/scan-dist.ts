/**
 * Static scan of extension build output.
 * Fails CI if remote JS/WASM imports, eval/new Function, or non-allowlisted
 * network endpoints (likely fetch/XHR targets) are found.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;

const ALLOWED_PROGRAMMATIC_ENDPOINT_PATTERNS = [
  /chrome-extension:/,
  /127\.0\.0\.1/,
  /chrome\.google\.com\/webstore/,
  /chromewebstore\.google\.com/,
  // React production error decoder URLs embedded by the bundler (not fetched by us)
  /react\.dev\/errors/,
];

// Exact user-visible links opened only after a click. These are not fetch/XHR
// destinations and must remain separate from the programmatic endpoint list.
const ALLOWED_NAVIGATION_URLS = new Set([
  'https://craighsieh.github.io/VerityRead/privacy/',
]);

const FORBIDDEN_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'eval(', re: /\beval\s*\(/ },
  { name: 'new Function', re: /new\s+Function\s*\(/ },
  { name: 'remote https script', re: /https?:\/\/[^"'`\s]+\.js\b/ },
  { name: 'remote wasm', re: /https?:\/\/[^"'`\s]+\.wasm\b/ },
  { name: 'import from http', re: /import\s*\(\s*['"]https?:/ },
];

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (/\.(js|mjs|css|html|json)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function findUrls(content: string): string[] {
  const re = /https?:\/\/[^\s"'`<>]+/g;
  return content.match(re) ?? [];
}

// Manifest match patterns (e.g. http star slash star) are not network endpoints.
function isMatchPatternNoise(url: string): boolean {
  return url.includes('*') || url.endsWith('://');
}

function isSchemaOrDocsNoise(url: string): boolean {
  return (
    url.includes('www.w3.org') ||
    url.includes('reactjs.org') ||
    url.includes('vitejs.dev') ||
    url.includes('schemas.')
  );
}

async function main(): Promise<void> {
  try {
    await stat(DIST);
  } catch {
    console.error('dist/ not found. Run `pnpm build` first.');
    process.exit(1);
  }

  const files = await walk(DIST);
  const findings: string[] = [];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const rel = relative(DIST, file);
    const isManifest = rel.endsWith('manifest.json');

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.re.test(content)) {
        findings.push(`${rel}: forbidden pattern ${pattern.name}`);
      }
    }

    // Skip URL allowlist on manifest — host match patterns are not connect-src targets.
    if (isManifest) continue;

    for (const url of findUrls(content)) {
      if (isMatchPatternNoise(url) || isSchemaOrDocsNoise(url)) continue;
      const allowed =
        ALLOWED_NAVIGATION_URLS.has(url) ||
        ALLOWED_PROGRAMMATIC_ENDPOINT_PATTERNS.some((pattern) => pattern.test(url));
      if (!allowed) {
        findings.push(`${rel}: non-allowlisted endpoint ${url}`);
      }
    }
  }

  if (findings.length) {
    console.error('scan-dist FAILED:');
    for (const f of findings) console.error(' -', f);
    process.exit(1);
  }

  console.log(`scan-dist OK (${files.length} files scanned)`);
}

void main();
