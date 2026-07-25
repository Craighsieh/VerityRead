# VerityRead Tasks (Phase 0 + Phase 1)

## Stage A — Scaffold & docs

- [x] Vite + CRXJS + React + TypeScript scaffold
- [x] Manifest V3 minimal permissions + CSP
- [x] Background / Side Panel / Content Script skeleton + typed messages
- [x] ARCHITECTURE / THREAT_MODEL / PRIVACY_TEST_PLAN / TASKS / ADRs

## Stage B — Phase 0 spikes

- [x] Spike 1: Chrome Built-in AI probe (Labs tab + provider)
- [x] Spike 2: Ollama CORS / health / stream provider + OS guides
- [x] Spike 3: Extract + sourceBlockId + jump highlight
- [x] Spike 4: Playwright egress harness
- [x] Spike 5: `scripts/scan-dist.ts`
- [x] Phase 0 gate checklist (`docs/PHASE0_GATE.md`)

## Stage C — Provider layer

- [x] `LocalAIProvider` interface
- [x] ChromeBuiltinAIProvider
- [x] OllamaProvider (loopback only)
- [x] ProviderRegistry + privacy receipts
- [x] Unit tests (Ollama health, sanitize, etc.)

## Stage D — Extract & retrieval

- [x] Engineered extract + protected pages
- [x] Quality threshold / selection fallback messaging
- [x] Chunker + map-reduce plan
- [x] Local retrieval + confidence threshold
- [x] Unit tests with fixtures

## Stage E — Core features

- [x] Summarize 3 modes + stream/stop + citations + cache
- [x] Ask page + verified sources + refuse
- [x] Selection translate + context menu + engine label
- [x] Output sanitize

## Stage F — Onboarding & Privacy

- [x] Onboarding capability check + provider setup
- [x] Privacy Center
- [x] Offline Lock
- [x] Unified error catalog

## Stage G — Storage / perf / tests

- [x] Preferences + IndexedDB cache; history default off
- [x] Perf notes / measurement helpers (`docs/PERF.md`)
- [x] Privacy tests + unit + egress
- [x] Accessibility basics (focus-visible, labels, stop buttons)

## Stage H — Alpha

- [x] Build + CI script (`pnpm pipeline`)
- [x] Alpha checklist (`docs/ALPHA_CHECKLIST.md`)

## Stage I — 0.1.0 release readiness

- [x] VerityRead／真閱 identity and public repository metadata
- [x] Five runtime and manifest locales: English, Traditional Chinese, Simplified Chinese, Japanese, Korean
- [x] Prominent in-product privacy disclosure and consent versioning
- [x] Dynamic page-reader injection plus exact-site optional permission controls
- [x] Opt-in cache migration and fixed Ollama loopback boundary
- [x] Public privacy policy and localized Chrome Web Store listing copy
- [x] Store icon, promo tiles, and two real UI screenshots per locale
- [x] Type-aware ESLint and loaded-extension Playwright tests in CI
- [ ] Anthropic-assisted Japanese/Korean language QA (requires local API credential)
- [ ] External manual smoke and Chrome Web Store Developer Dashboard submission
