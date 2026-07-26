# VerityRead 0.1.0 release readiness

Last reviewed: 2026-07-26

## Current decision

**Code and store-package automation: PASS. Chrome Web Store review: PENDING.**

Version 0.1.0 was submitted to the Chrome Web Store on 2026-07-26. The
Developer Dashboard reports `待審查` (pending review). It must not yet be
described as published or approved; automatic publication is enabled for after
approval.

## Automated evidence

- `pnpm pipeline`
  - Type-aware ESLint: pass
  - TypeScript: pass
  - Vitest: 66 tests pass
  - Production MV3 build: pass
  - Dist remote-code/endpoint scan: pass
- `pnpm test:e2e`
  - 8 Playwright tests pass
  - Production extension bundle loads in Playwright Chromium
  - Manifest contains no static content script
  - Required host access is limited to `127.0.0.1:11434`
  - Optional website patterns are not granted at installation
  - Prominent privacy consent blocks onboarding progression until checked
  - Legacy cache/custom-endpoint preferences migrate to safer defaults
  - A page cannot be read or leaked without a user grant
  - A queued context-menu action is claimed when the side panel cold-starts
- Five locales each define all 194 runtime UI strings explicitly
- Five manifest locales are present in the production bundle
- Anthropic-assisted Japanese/Korean language QA completed with Claude Sonnet 5
  - 0 blocker or major issues remain
  - Non-blocking stylistic suggestions are recorded in
    `docs/qa/anthropic-ja-ko.json`
  - Only public UI, listing, privacy, and setup copy was reviewed; no page
    content or user data was submitted
- Public Ollama setup guides cover English, Traditional Chinese, Simplified
  Chinese, Japanese, and Korean
- Ten real UI store screenshots are 1280×800
- Store icon and promo tiles match Chrome Web Store dimensions
- Privacy policy, dashboard answers, permission justifications, and localized
  listing copy are prepared under `docs/`

## Completed external gates

- [x] In Chrome Stable, click the real toolbar action and confirm dynamic
      `activeTab` extraction, summarize, ask, source jump, selection translation,
      and Stop using a normal article.
- [x] Repeat the core task smoke with both an available Chrome Built-in AI model
      and Ollama where the device supports them.
- [x] Verify a protected page shows a clear error and exact-site permission can
      be granted and revoked from Settings.
- [x] Push the branch and enable GitHub Pages from `/docs`; verify homepage,
      support, and privacy URLs publicly.
- [x] Verify publisher identity and `craighsieh@gmail.com` in the Chrome Web
      Store Developer Dashboard.
- [x] Copy the prepared privacy disclosures/listing copy, upload the matching
      locale assets, and review the dashboard's automated warnings.
- [x] Submit for Chrome Web Store review.

## Chrome Web Store submission

- Item ID: `ocpdemeggjodckegncmndokciofklfde`
- Submitted version: `0.1.0`
- Submitted: 2026-07-26
- Current dashboard status: `待審查` (pending review)
- Distribution: free, public, all regions
- Publication: automatic after approval
- Category: Productivity → Tools
- Localized listings and screenshots: English, Traditional Chinese, Simplified
  Chinese, Japanese, and Korean
- Disclosed data categories available in the current dashboard: Website content
  and Web history. The dashboard did not offer a separate User-generated content
  category; prompts and locally generated answers remain covered by the public
  privacy policy and reviewer instructions.

## Remaining release gates

- [ ] Receive Chrome Web Store approval.
- [ ] Verify the public store listing and install the approved build from the
      Chrome Web Store on Chrome Stable.
- [ ] Re-run the core smoke test against the store-installed build.
- [ ] Record and address any reviewer feedback without changing the pending
      submission unless a new package is required.

## Release artifacts

- Production extension directory: `dist/`
- Upload ZIP: `release/verityread-0.1.0.zip`
- Upload ZIP SHA-256:
  `b9b131adb1d8b92eeb6cb554a6810bcd5d345e5a065f029d7e1616770f77cd78`
- Store assets: `assets/store/`
- Store listing source: `docs/store/LISTING.md`
- Privacy-practices source: `docs/store/PRIVACY_PRACTICES.md`
