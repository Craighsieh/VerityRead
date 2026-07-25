# Spike 4 — Egress test framework

## Goal

Automate assertion that page markers never appear in external requests.

## How to run

```bash
pnpm test:egress
```

## Decision

Keep Playwright harness in CI. Extend with full `--load-extension` persistent context smoke in Alpha hardware runs.
