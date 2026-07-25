# ADR-005: Defer WebGPU

## Status

Accepted

## Context

WebGPU models add weight download, memory, WASM packaging, compatibility, and store-review risk.

## Decision

MVP validates demand with Chrome Built-in AI + Ollama. WebGPU is P1 after core jobs are proven. Capability check may display WebGPU presence without enabling inference.

## Consequences

- Smaller MVP surface
- Coverage gap for devices without Chrome AI/Ollama until P1
