# App: api-gateway

## Purpose

Single frontend-facing edge API that stabilizes endpoint contracts for the web app.

## Entry Points

- `ApiGatewayApplication.java`
- `api/GatewayController.java`

## Exposed Endpoints

- `GET /api/v1/geospatial/flights`
- `GET /api/v1/geospatial/earthquakes`
- `GET /api/v1/geospatial/satellites`
- `GET /api/v1/geospatial/weather/radar-frames`
- `GET /api/v1/markets/quotes`
- `GET /api/v1/addons/cctv/countries`
- `GET /api/v1/addons/cctv/webcams`
- `GET /api/v1/addons/cctv/webcams/{webcamId}`

## Internal Components

- `service/GatewaySnapshotService.java`
  - Aggregates geospatial proxy and market service.
- `integrations/geospatial/GeospatialProxyClient.java`
  - Calls downstream `geospatial-service`.
  - Returns empty list fallback on downstream errors.
- `service/MarketQuoteService.java`
  - Provides market quote payloads.
- `service/CctvAddonService.java`
  - Exposes CCTV addon queries for the frontend left-menu monitor panel.
- `integrations/webcams/WebcamsApiClient.java`
  - Calls Windy Webcams API v3 with `x-windy-api-key`.
  - Maps API payloads into stable addon DTOs.

## Config

`application.yml`:

- port `8082`
- `vision.geospatial.base-url` (default `http://localhost:8083`)
- `vision.webcams.base-url` (default `https://api.windy.com`)
- `vision.webcams.api-key` (from `VISION_WEBCAMS_API_KEY`)
