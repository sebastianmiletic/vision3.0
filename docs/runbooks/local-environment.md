# Local Environment Setup

## One Command Start

- Install dependencies: `npm install`
- Start entire stack: `npm run dev`
- Open: `http://localhost:8080`

## Runtime Ports

- `web-command`: 8080
- `api-gateway`: 8081
- `geospatial-service`: 8082
- `data-ingestion`: 8083

## Integration Topology

- `data-ingestion` polls OpenSky/USGS/CelesTrak/RainViewer in separate integration modules.
- `data-ingestion` publishes normalized records to `geospatial-service` ingest endpoints.
- `api-gateway` proxies geospatial reads to `geospatial-service` and exposes `/api/v1/*` for frontend.
- `web-command` renders Cesium + Google photorealistic tiles and polls `/api/v1/geospatial/flights` for live aircraft entities.

## Local Credentials File

Create `.env.local` in repo root.

Required now:
- `VITE_GOOGLE_MAPS_API_KEY`

Recommended now:
- `VITE_CESIUM_ION_ACCESS_TOKEN`

Live ingestion:
- `VISION_INTEGRATIONS_OPENSKY_CLIENT_ID`
- `VISION_INTEGRATIONS_OPENSKY_CLIENT_SECRET`

Optional overrides:
- `VISION_INTEGRATIONS_USGS_FEED_URL`
- `VISION_INTEGRATIONS_CELESTRAK_FEED_URL`
- `VISION_INTEGRATIONS_RAINVIEWER_FEED_URL`
- `VISION_INTEGRATIONS_GEOSPATIAL_BASE_URL`
- `VISION_GEOSPATIAL_BASE_URL`

## Credential Sources

- Google Map Tiles API key: https://developers.google.com/maps/documentation/tile/3d-tiles
- Cesium ion token: https://cesium.com/learn/ion/cesium-ion-access-tokens/
- OpenSky OAuth2 credentials: https://openskynetwork.github.io/opensky-api/rest.html

## E2E Prerequisite

Install Playwright browser binaries once:

- `npx playwright install`
