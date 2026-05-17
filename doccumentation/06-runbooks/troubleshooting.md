# Runbook: Troubleshooting

## Globe Visible But Tiles Missing

Checks:

1. `VITE_GOOGLE_MAPS_API_KEY` is present in `.env.local`.
2. Google Map Tiles API enabled in Google Cloud project.
3. Billing enabled for that project.
4. Browser console for tile request errors.
5. Confirm Cesium static files resolve:
   - `/cesiumStatic/Assets/approximateTerrainHeights.json`
   - `/cesiumStatic/Workers/transferTypedArrayTest.js`
6. If these return HTML instead of JSON/JS, rerun `npm run dev` to trigger `predev` asset sync.

## UI Font Does Not Match Reference

Checks:

1. `apps/web-command/index.html` contains Google Fonts links for Orbitron and Share Tech Mono.
2. Network tab confirms font stylesheets loaded from `fonts.googleapis.com` and `fonts.gstatic.com`.
3. No browser extension overrides fonts.

## No Flight Data

Checks:

1. OpenSky credentials set in `.env.local`.
2. `data-ingestion` logs for OpenSky token/poll failures.
3. `GET /api/v1/ingestion/run` returns `OpenSky` source result.
4. `GET /api/v1/geospatial/flights` returns records.
5. Confirm proxy path from web app:
   - `curl http://localhost:8081/api/v1/geospatial/flights`
   - if this fails while `8082` works, restart the web app to refresh Vite proxy state.

## Gateway Returns Empty Lists

Expected behavior when downstream is unavailable.

Checks:

1. `geospatial-service` running on expected port.
2. `VISION_GEOSPATIAL_BASE_URL` points correctly.
3. geospatial ingest endpoints receiving updates.

## CCTV Addon Errors / Empty Camera Gallery

Checks:

1. Gateway is reachable:
   - `curl http://localhost:8082/api/v1/addons/cctv/countries`
2. Web proxy path is reachable:
   - `curl http://localhost:8081/api/v1/addons/cctv/countries`
3. `VISION_WEBCAMS_API_KEY` is set in `.env.local` and exported via `npm run dev`.
4. If camera thumbnails go blank after a while, refresh/reopen CCTV panel (tokenized URLs expire on provider schedule and are refreshed periodically by runtime hooks).
