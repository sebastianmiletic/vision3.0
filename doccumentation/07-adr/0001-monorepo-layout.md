# ADR 0001: Apps + Packages Monorepo

## Status

Accepted

## Decision

Use a single repository with deployable applications in `apps/` and reusable contracts/config in `packages/`.

## Rationale

- Clear ownership per runtime surface.
- Strong discoverability for feature placement.
- Shared contracts reduce drift between frontend and backend.
- Supports one-command orchestration while preserving module isolation.

## Consequences

- Cross-app changes are visible in one workspace.
- CI and local scripts must handle mixed Node + Java toolchains.
