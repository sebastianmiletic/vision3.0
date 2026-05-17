# Local Development

## Prerequisites

- Node.js 20+ with npm.
- Java 21 for Spring Boot services.
- Maven 3.9+.
- Network access to external providers (Google tiles, OpenSky, USGS, CelesTrak, RainViewer).

## One Command Runtime

From repo root:

```bash
npm install
npm run dev
```

Open:

- `http://localhost:8081`

`npm run dev` runs all services concurrently through `scripts/dev-stack.sh`.
Before Vite starts, `apps/web-command/predev` synchronizes Cesium static assets into `apps/web-command/public/cesiumStatic` so Workers and terrain support files resolve correctly in development.

## Runtime Ports

- `web-command`: `8081`
- `api-gateway`: `8082`
- `geospatial-service`: `8083`
- `data-ingestion`: `8084`

The launcher performs a pre-flight port check and stops early if any required port is already occupied.

## Runtime Composition

- `web-command` renders the UI shell and globe.
- `api-gateway` exposes the frontend API at `/api/v1/*`.
- `geospatial-service` stores normalized snapshots in-memory.
- `data-ingestion` polls external providers and publishes normalized records into `geospatial-service`.
