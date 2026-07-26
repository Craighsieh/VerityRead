# Phase 0 Exit Gate

## Required evidence

1. **Chrome Built-in AI device** can complete a summary via Side Panel (or Labs spike shows `available`/`downloadable` and session create works when present).
2. **Ollama device** can complete a summary via Ollama Provider with loopback only.
3. **Egress:** `pnpm test:egress` passes; page markers never leave exempt destinations.
4. **Jump-back:** Extract spike or Summarize citations scroll + highlight the source block.
5. **Static scan:** `pnpm build && pnpm scan:dist` passes.

## Manual checklist

- [x] Load unpacked `dist/` in `chrome://extensions`
- [x] Complete Onboarding capability check without reading a page
- [x] Summarize `tests/fixtures/article.html` (served locally or opened as file with caveats)
- [x] Click a source citation → page scrolls/highlights
- [x] Labs → Spike Ollama shows healthy or actionable CORS guide
- [x] Privacy Center shows Offline Lock and allowed destinations

## Notes

If Chrome Built-in AI is unavailable on the test machine, document the availability JSON from Labs and complete the Ollama path for gate item 2.

Manual Chrome Stable acceptance and the Ollama loopback/CORS path were completed
before the 0.1.0 Chrome Web Store submission on 2026-07-26.
