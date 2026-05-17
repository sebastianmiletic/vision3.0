# Environment Variables

Create `.env.local` at repository root. The launcher auto-loads this file.

## Required For Globe

- `VITE_GOOGLE_MAPS_API_KEY`
  - Used by `apps/web-command` to load Google Photorealistic 3D Tiles.

## Recommended

- `VITE_CESIUM_ION_ACCESS_TOKEN`
  - Enables Cesium ion features and fallback tile provider mode.
- `VITE_TILE_PROVIDER`
  - Allowed values: `google` (default), `cesium-ion`.

## Required For OpenSky Polling

- `VISION_INTEGRATIONS_OPENSKY_CLIENT_ID`
- `VISION_INTEGRATIONS_OPENSKY_CLIENT_SECRET`

## Required For CCTV Addon

- `VISION_WEBCAMS_API_KEY`
  - Used by `api-gateway` to authorize calls to Windy Webcams API v3.

## Optional Service Overrides

- `VITE_API_BASE_URL` (frontend -> API gateway; default `http://localhost:8082`)
- `VISION_GEOSPATIAL_BASE_URL` (api-gateway -> geospatial-service; default `http://localhost:8083`)
- `VISION_INTEGRATIONS_GEOSPATIAL_BASE_URL` (data-ingestion -> geospatial-service; default `http://localhost:8083`)
- `VISION_WEBCAMS_BASE_URL` (api-gateway -> Windy Webcams API; default `https://api.windy.com`)

## Optional Feed URL Overrides

- `VISION_INTEGRATIONS_USGS_FEED_URL`
- `VISION_INTEGRATIONS_CELESTRAK_FEED_URL`
- `VISION_INTEGRATIONS_RAINVIEWER_FEED_URL`
- `VISION_INTEGRATIONS_OPENSKY_BASE_URL`
- `VISION_INTEGRATIONS_OPENSKY_TOKEN_URL`

## Key Provisioning Links

- Google 3D tiles key setup: https://developers.google.com/maps/documentation/tile/3d-tiles
- Cesium ion token setup: https://cesium.com/learn/ion/cesium-ion-access-tokens/
- OpenSky auth docs: https://openskynetwork.github.io/opensky-api/rest.html
