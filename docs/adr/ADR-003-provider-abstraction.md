# ADR-003: Provider abstraction

## Status

Accepted

## Context

Chrome Built-in AI availability varies by device/channel. Ollama is critical for early technical users. Features must not hard-code `window.ai` or a single backend.

## Decision

All inference goes through `LocalAIProvider` with runtime capability detection. UI always shows the selected Provider; switching is explicit.

## Consequences

- Higher initial engineering cost
- Enables future WebGPU / OpenAI-compatible adapters without rewriting features
- Prevents silent cloud fallback
