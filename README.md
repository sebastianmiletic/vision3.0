# Vision v3.0

Vision v3.0 is a browser-based geospatial command center with a CesiumJS 3D globe, live intelligence layers, and Spring Boot backend services.

## Monorepo Layout

- `apps/web-command`: React + Vite + TypeScript command-center UI and Cesium integration.
- `apps/api-gateway`: Spring Boot edge service exposing frontend-facing APIs.
- `apps/data-ingestion`: Spring Boot scheduled pollers for OpenSky, USGS, CelesTrak, and RainViewer.
- `apps/geospatial-service`: Spring Boot in-memory geospatial cache and normalized APIs.
- `packages/shared-types`: Shared TypeScript contracts and runtime schemas.
- `packages/config`: Shared linting and TypeScript config presets.
- `doccumentation`: ADRs, integration guides, architecture docs, API docs, and runbooks.

## One Command Run

1. `npm install`
2. `npm run dev`
3. Open `http://localhost:8081`

The single command starts all runtime pieces together:

- web-command: `8081`
- api-gateway: `8082`
- geospatial-service: `8083`
- data-ingestion: `8084`

## Credentials

The launcher script reads `.env.local` automatically.

Required for globe rendering:

- `VITE_GOOGLE_MAPS_API_KEY`

Recommended:

- `VITE_CESIUM_ION_ACCESS_TOKEN`

Live ingestion:

- `VISION_INTEGRATIONS_OPENSKY_CLIENT_ID`
- `VISION_INTEGRATIONS_OPENSKY_CLIENT_SECRET`

Addon integrations:

- `VISION_WEBCAMS_API_KEY` (for Public CCTV Monitor addon)

See `doccumentation/00-getting-started/environment-variables.md` and `doccumentation/06-runbooks/local-environment.md`.
