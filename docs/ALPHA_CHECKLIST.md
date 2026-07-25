# Alpha Release Checklist

## Build

- [ ] `pnpm pipeline` green (typecheck, unit tests, build, scan:dist)
- [ ] `pnpm test:egress` green
- [ ] Load unpacked `dist` on Chrome Desktop

## Product

- [ ] Onboarding: privacy → capability → provider → finish
- [ ] Summarize: quick / bullets / outline + stop
- [ ] Ask: citations jump back; off-page questions refuse
- [ ] Translate: context menu + copy; engine labeled
- [ ] Privacy Center: offline lock, clear data
- [ ] Header always shows active Provider

## Privacy / security

- [ ] No P0 privacy issues
- [ ] No unapproved egress
- [ ] History remains off by default
- [ ] Protected pages show actionable error

## Closed test

- [ ] Recruit 10–20 technical/business users
- [ ] Track: setup success, task success, privacy confusion
- [ ] Exit: setup ≥60%, task success ≥85%, zero P0 privacy bugs
