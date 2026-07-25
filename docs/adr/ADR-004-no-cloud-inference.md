# ADR-004: No cloud inference (MVP)

## Status

Accepted

## Context

Core product promise: do not send page content to cloud inference. Absolute “100% zero network” claims are avoided because updates/downloads may need network.

## Decision

MVP provides no cloud model fallback. Any future fallback requires explicit user consent and a separate data plane. Page content must never enter license/update/error payloads.

## Consequences

- Some users without Chrome AI or Ollama cannot complete tasks — onboarding must explain alternatives
- Stronger brand trust and simpler threat model
