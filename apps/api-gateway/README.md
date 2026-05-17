# API Gateway

Spring Boot edge API for frontend consumers.

## Responsibilities

- Proxy geospatial endpoints from `geospatial-service`.
- Includes dedicated military-flight proxy route:
  - `GET /api/v1/geospatial/military-flights`
- Expose frontend-friendly market quote endpoint.
- Proxy Windy Webcams API v3 for the CCTV addon.
- Keep API surface stable at `/api/v1/*` for the web app.

## Detailed Docs

- `../../doccumentation/02-apps/api-gateway.md`
- `../../doccumentation/05-api/public-endpoints.md`
