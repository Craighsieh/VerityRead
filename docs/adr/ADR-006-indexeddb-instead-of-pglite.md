# ADR-006: IndexedDB instead of PGlite for initial scale

## Status

Accepted

## Context

MVP page retrieval is small (current page only). PGlite/Postgres WASM adds bundle size and complexity without clear benefit.

## Decision

Use in-memory/hybrid keyword retrieval for the current page. Optional summary cache in IndexedDB. Revisit SQLite-WASM/OPFS when multi-doc RAG creates a measured bottleneck.

## Consequences

- Faster MVP
- Will need migration work for P2 multi-document RAG
