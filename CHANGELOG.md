# Changelog

## 0.2.0 - 2026-05-12

- Added single-command runtime orchestration: `npm run dev` starts frontend + all backend services.
- Normalized local ports to support `localhost:8080` frontend entrypoint.
- Split ingestion integrations into separate provider modules:
  - OpenSky
  - USGS
  - CelesTrak
  - RainViewer
  - Geospatial ingest publisher
- Refactored API gateway to proxy geospatial data from geospatial-service.
- Split frontend API integrations into separate per-source files.
- Updated runbooks and module READMEs for the new orchestration flow.

## 0.1.0 - 2026-05-12

- Initialized Vision v3.0 monorepo with `apps/` + `packages/` structure.
- Implemented first-pass command-center frontend with Cesium integration.
- Scaffolded Spring Boot services and shared contracts.
