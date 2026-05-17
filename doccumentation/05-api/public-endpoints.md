# Public Endpoints

## API Gateway (`:8082`)

- `GET /api/v1/geospatial/flights`
- `GET /api/v1/geospatial/military-flights`
- `GET /api/v1/geospatial/earthquakes`
- `GET /api/v1/geospatial/satellites`
- `GET /api/v1/geospatial/weather/radar-frames`
- `GET /api/v1/markets/quotes`
- `GET /api/v1/addons/cctv/countries`
- `GET /api/v1/addons/cctv/webcams`
- `GET /api/v1/addons/cctv/webcams/{webcamId}`

## Geospatial Service (`:8083`)

Read:

- `GET /api/v1/geospatial/snapshot`
- `GET /api/v1/geospatial/flights`
- `GET /api/v1/geospatial/military-flights`
- `GET /api/v1/geospatial/earthquakes`
- `GET /api/v1/geospatial/satellites`
- `GET /api/v1/geospatial/weather/radar-frames`

Ingest:

- `POST /api/v1/geospatial/ingest/flights`
- `POST /api/v1/geospatial/ingest/military-flights`
- `POST /api/v1/geospatial/ingest/earthquakes`
- `POST /api/v1/geospatial/ingest/satellites`
- `POST /api/v1/geospatial/ingest/weather/radar-frames`

## Data Ingestion (`:8084`)

- `GET /api/v1/ingestion/run` (manual cycle trigger)
