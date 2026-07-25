# ADR-001: Chrome-only MVP

## Status

Accepted

## Context

Chrome Side Panel, Built-in AI APIs, and Firefox Sidebar differ in architecture and availability. Supporting Edge/Firefox in MVP increases test matrix cost.

## Decision

Ship MVP for Chrome Desktop stable only. Edge/Firefox require independent QA before claiming support.

## Consequences

- Faster path to validating privacy + citation value
- Explicit non-goals for mobile Chrome and other browsers in Phase 0/1
