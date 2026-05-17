# System Overview

## Monorepo Layout

- `apps/web-command`: React + Vite + TypeScript UI and Cesium rendering.
- `apps/api-gateway`: Spring Boot API edge for frontend consumers.
- `apps/geospatial-service`: Spring Boot in-memory geospatial snapshot store.
- `apps/data-ingestion`: Spring Boot scheduled ingestion and normalization.
- `packages/shared-types`: shared TypeScript contracts.
- `packages/config`: shared tooling configuration.

## Design Goals

- Separate each integration and runtime concern into dedicated files/modules.
- Keep shared contracts centralized to prevent payload drift.
- Maintain one-command developer startup with predictable local ports.
- Preserve a UI-first command-center shell while supporting backend expansion.

## Runtime Topology

1. Ingestion services poll source APIs.
2. Normalized records are posted into geospatial ingest endpoints.
3. Geospatial service updates atomic snapshot state.
4. API gateway proxies read endpoints to frontend.
5. Web command polls gateway endpoints and renders layers.
