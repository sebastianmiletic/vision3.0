# Vision v3.0

Vision v3.0 is a browser-based geospatial command center with a CesiumJS 3D globe, live intelligence layers, and Spring Boot backend services.

## Monorepo Layout

- `apps/web-command`: React + Vite + TypeScript command-center UI and Cesium integration.
- `apps/api-gateway`: Spring Boot edge service exposing frontend-facing APIs.
- `apps/data-ingestion`: Spring Boot scheduled pollers for OpenSky, USGS, CelesTrak, and RainViewer.
- `apps/geospatial-service`: Spring Boot in-memory geospatial cache and normalized APIs.
- `packages/shared-types`: Shared TypeScript contracts and runtime schemas.
- `packages/config`: Shared linting and TypeScript config presets.
- `docs`: ADRs, API contracts, runbooks.

## One Command Run

1. `npm install`
2. `npm run dev`
3. Open `http://localhost:8080`

The single command starts all runtime pieces together:
- web-command: `8080`
- api-gateway: `8081`
- geospatial-service: `8082`
- data-ingestion: `8083`

## Credentials

The launcher script reads `.env.local` automatically.

Required for globe rendering:
- `VITE_GOOGLE_MAPS_API_KEY`

Recommended:
- `VITE_CESIUM_ION_ACCESS_TOKEN`

Live ingestion:
- `VISION_INTEGRATIONS_OPENSKY_CLIENT_ID`
- `VISION_INTEGRATIONS_OPENSKY_CLIENT_SECRET`

See `docs/runbooks/local-environment.md` for details.
