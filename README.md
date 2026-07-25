# VaultLens

Privacy-first local AI browser assistant for Chrome Desktop.

Summarize the current page, ask questions with jump-back citations, and translate selections — using Chrome Built-in AI or local Ollama. Page content is not sent to cloud inference by default.

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
4. Open the Side Panel via the VaultLens action icon

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Vite + CRXJS development build |
| `pnpm build` | Production build to `dist/` |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:egress` | Playwright egress harness |
| `pnpm scan:dist` | Static scan for remote code / endpoints |
| `pnpm pipeline` | typecheck + test + build + scan |

## Docs

- [HANDOFF_CODEX.md](docs/HANDOFF_CODEX.md) — **给 Codex / 下一任开发者的交接清单**
- [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [THREAT_MODEL.md](docs/THREAT_MODEL.md)
- [PRIVACY_TEST_PLAN.md](docs/PRIVACY_TEST_PLAN.md)
- [TASKS.md](docs/TASKS.md)
- [ADRs](docs/adr/)
- Product PRD: `VaultLens_Local_AI_Browser_PRD_v1.0.md`

## Privacy principles

- User-triggered tab access only
- Visible Provider / data routing (privacy receipt)
- No cloud inference fallback in MVP
- Offline Lock + clear local data
- History off by default

## License

Private / TBD. Privacy-critical modules are structured for reproducible builds and egress testing.
