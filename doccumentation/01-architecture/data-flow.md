# Data Flow

## Polling and Ingestion Sequence

1. `apps/data-ingestion` executes `PollingOrchestrator.runAll()`.
2. Each source module polls independently:
   - OpenSky
   - USGS
   - CelesTrak
   - RainViewer
3. Each poll returns a `PollBatch` containing:
   - source name
   - normalized records
   - fetch timestamp
   - status (`OK`/fallback state)
4. Successful batches are published via `GeospatialIngestClient`.
5. `apps/geospatial-service` ingests layer payloads through dedicated endpoints.
6. `GeospatialStore` writes each layer as a new immutable snapshot.

## Frontend Read Sequence

1. `apps/web-command` integration service calls `/api/v1/geospatial/*` on `api-gateway`.
2. `api-gateway` resolves data via `GeospatialProxyClient`.
3. Response is mapped into Cesium entities in feature presenters.
4. UI status text/counters update through layer telemetry helpers.

## Failure Behavior

- Integration failure in ingestion does not stop the other source modules.
- Proxy failure in `api-gateway` returns empty lists and logs warnings.
- Frontend polling failure updates status text to waiting/standby and retries next interval.
