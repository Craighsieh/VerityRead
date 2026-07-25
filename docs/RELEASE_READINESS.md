# VerityRead 0.1.0 release readiness

Last reviewed: 2026-07-26

## Current decision

**Code and store-package automation: PASS. External publication: HOLD.**

This is the 0.1.0 release candidate. It must not yet be described as published
or fully approved by the Chrome Web Store until the external gates below are
completed.

## Automated evidence

- `pnpm pipeline`
  - Type-aware ESLint: pass
  - TypeScript: pass
  - Vitest: 55 tests pass
  - Production MV3 build: pass
  - Dist remote-code/endpoint scan: pass
- `pnpm test:e2e`
  - 7 Playwright tests pass
  - Production extension bundle loads in Playwright Chromium
  - Manifest contains no static content script
  - Required host access is limited to `127.0.0.1:11434`
  - Optional website patterns are not granted at installation
  - Prominent privacy consent blocks onboarding progression until checked
  - Legacy cache/custom-endpoint preferences migrate to safer defaults
  - A page cannot be read or leaked without a user grant
- Five locales each define all 185 runtime UI strings explicitly
- Five manifest locales are present in the production bundle
- Anthropic-assisted Japanese/Korean language QA completed with Claude Sonnet 5
  - 0 blocker or major issues remain
  - Non-blocking stylistic suggestions are recorded in
    `docs/qa/anthropic-ja-ko.json`
  - Only public UI, listing, and privacy copy was reviewed; no page content or
    user data was submitted
- Ten real UI store screenshots are 1280×800
- Store icon and promo tiles match Chrome Web Store dimensions
- Privacy policy, dashboard answers, permission justifications, and localized
  listing copy are prepared under `docs/`

## External gates still required

- [ ] In Chrome Stable, click the real toolbar action and confirm dynamic
  `activeTab` extraction, summarize, ask, source jump, selection translation,
  and Stop using a normal article.
- [ ] Repeat the core task smoke with both an available Chrome Built-in AI model
  and Ollama where the device supports them.
- [ ] Verify a protected page shows a clear error and exact-site permission can
  be granted and revoked from Settings.
- [ ] Push the branch and enable GitHub Pages from `/docs`; verify homepage,
  support, and privacy URLs publicly.
- [ ] Verify publisher identity and `craighsieh@gmail.com` in the Chrome Web
  Store Developer Dashboard.
- [ ] Copy the prepared privacy disclosures/listing copy, upload the matching
  locale assets, and review the dashboard's automated warnings.
- [ ] Submit for Chrome Web Store review.

## Release artifacts

- Production extension directory: `dist/`
- Upload ZIP: `release/verityread-0.1.0.zip`
- Upload ZIP SHA-256:
  `7c066255372deb1cc75efb64a015733e3e0dfe219836bfae3e70178bb93d02e9`
- Store assets: `assets/store/`
- Store listing source: `docs/store/LISTING.md`
- Privacy-practices source: `docs/store/PRIVACY_PRACTICES.md`
