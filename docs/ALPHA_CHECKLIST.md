# Alpha Release Checklist

## Build

- [x] `pnpm pipeline` green (typecheck, unit tests, build, scan:dist)
- [x] `pnpm test:egress` green
- [x] Load unpacked `dist` on Chrome Desktop

## Product

- [x] Onboarding: privacy → capability → provider → finish
- [x] Summarize: quick / bullets / outline + stop
- [x] Ask: citations jump back; off-page questions refuse
- [x] Translate: context menu + copy; engine labeled
- [x] Privacy Center: offline lock, clear data
- [x] Header always shows active Provider

## Privacy / security

- [x] No P0 privacy issues
- [x] No unapproved egress
- [x] History remains off by default
- [x] Protected pages show actionable error

## Closed test

- [ ] Recruit 10–20 technical/business users
- [ ] Track: setup success, task success, privacy confusion
- [ ] Exit: setup ≥60%, task success ≥85%, zero P0 privacy bugs

The engineering and manual Chrome Stable gates above were complete when 0.1.0
was submitted for Chrome Web Store review on 2026-07-26. Closed-test product
metrics remain separate from store-review status.
