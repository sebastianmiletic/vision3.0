# App: geospatial-service

## Purpose

Central normalized geospatial snapshot store for flights, earthquakes, satellites, and radar frames.

## Entry Points

- `GeospatialServiceApplication.java`
- `api/GeospatialController.java`

## Read Endpoints

- `GET /api/v1/geospatial/snapshot`
- `GET /api/v1/geospatial/flights`
- `GET /api/v1/geospatial/earthquakes`
- `GET /api/v1/geospatial/satellites`
- `GET /api/v1/geospatial/weather/radar-frames`

## Ingest Endpoints

- `POST /api/v1/geospatial/ingest/flights`
- `POST /api/v1/geospatial/ingest/earthquakes`
- `POST /api/v1/geospatial/ingest/satellites`
- `POST /api/v1/geospatial/ingest/weather/radar-frames`

## State Model

- `store/GeospatialStore.java` keeps an `AtomicReference<Snapshot>`.
- Layer updates replace snapshot immutably with new `updatedAt` timestamp.
- Service layer (`GeospatialSnapshotService.java`) isolates controller from store operations.
