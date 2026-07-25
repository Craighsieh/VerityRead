# Spike 5 — Dist static scan

## Goal

Fail release if dist contains `eval` / `new Function` / remote JS·WASM / non-allowlisted endpoints.

## How to run

```bash
pnpm build && pnpm scan:dist
```

## Decision

Gate every CI build with `pnpm scan:dist`.
