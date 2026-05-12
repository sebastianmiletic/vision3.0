# API Contract Overview (v1)

## Public Endpoints

### Geospatial

- `GET /api/v1/geospatial/flights`
- `GET /api/v1/geospatial/earthquakes`
- `GET /api/v1/geospatial/satellites`
- `GET /api/v1/geospatial/weather/radar-frames`
- `GET /api/v1/geospatial/snapshot` (geospatial-service only)

### Ingestion

- `GET /api/v1/ingestion/run`
- `POST /api/v1/geospatial/ingest/flights`
- `POST /api/v1/geospatial/ingest/earthquakes`
- `POST /api/v1/geospatial/ingest/satellites`
- `POST /api/v1/geospatial/ingest/weather/radar-frames`

### Markets

- `GET /api/v1/markets/quotes`

## Payload Contracts

Shared frontend contracts are defined in `packages/shared-types/src/index.ts`.
Backend currently returns schema-compatible mock payloads while ingestion/source mappers are scaffolded.
