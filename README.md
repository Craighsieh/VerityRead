# VerityRead／真閱

Privacy-first local AI browser assistant for Chrome Desktop.

Summarize the current page, ask questions with jump-back citations, and translate selections — using Chrome Built-in AI or local Ollama. Version 0.1.0 does not send page content to cloud inference.

## Quick start

```bash
pnpm install
pnpm dev
# or
pnpm build
```

1. Open `chrome://extensions`
2. Enable Developer mode
3. Load unpacked → select `dist/`
4. Open the Side Panel via the VerityRead action icon

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Vite + CRXJS development build |
| `pnpm build` | Production build to `dist/` |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | Playwright fixture and real loaded-extension tests |
| `pnpm scan:dist` | Static scan for remote code / endpoints |
| `pnpm pipeline` | lint + typecheck + unit test + build + scan |
| `pnpm capture:store` | Capture and compose localized 1280×800 store screenshots |

## Docs

- [Public site and privacy policy](https://craighsieh.github.io/VerityRead/)
- [HANDOFF_CURSOR.md](docs/HANDOFF_CURSOR.md) — **給 Cursor／下一任開發者的目前交接清單**
- [HANDOFF_CODEX.md](docs/HANDOFF_CODEX.md) — 歷史交接文件
- [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [THREAT_MODEL.md](docs/THREAT_MODEL.md)
- [PRIVACY_TEST_PLAN.md](docs/PRIVACY_TEST_PLAN.md)
- [RELEASE_READINESS.md](docs/RELEASE_READINESS.md)
- [TASKS.md](docs/TASKS.md)
- [ADRs](docs/adr/)
- Product PRD: `VerityRead_Local_AI_Browser_PRD_v1.0.md`

## Privacy principles

- User-triggered tab access only
- Visible Provider / data routing (privacy receipt)
- No cloud inference fallback in MVP
- Offline Lock + clear local data
- History off by default

## License

Source available in this public repository. No license is granted until a license
file is added. Privacy-critical modules are structured for reproducible builds and
egress testing.
