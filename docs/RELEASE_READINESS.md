# VerityRead 0.1.0 release readiness

Last reviewed: 2026-07-26

## Current decision

**Code and store-package automation: PASS. External publication: HOLD.**

The build may become the 0.1.0 release candidate after the external gates below
are completed. It must not yet be described as published or fully approved by
the Chrome Web Store.

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
- Ten real UI store screenshots are 1280×800
- Store icon and promo tiles match Chrome Web Store dimensions
- Privacy policy, dashboard answers, permission justifications, and localized
  listing copy are prepared under `docs/`

## External gates still required

- [ ] Run `pnpm qa:locales` with a locally supplied Anthropic API key; review and
  resolve every Japanese/Korean blocker or major issue. This is AI-assisted
  language QA, not native-speaker or legal certification.
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
- Store assets: `assets/store/`
- Store listing source: `docs/store/LISTING.md`
- Privacy-practices source: `docs/store/PRIVACY_PRACTICES.md`
