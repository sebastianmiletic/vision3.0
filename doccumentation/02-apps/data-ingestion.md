# App: data-ingestion

## Purpose

Provider-specific polling service that normalizes upstream data and publishes to geospatial-service.

## Entry Points

- `DataIngestionApplication.java`
- `api/PollingController.java` (`GET /api/v1/ingestion/run`)
- `service/StartupPollingRunner.java`
- `poller/ScheduledPoller.java`

## Orchestration

`service/PollingOrchestrator.java` executes source modules in this order:

1. OpenSky
2. USGS
3. CelesTrak
4. RainViewer

For each successful poll batch, records are posted to geospatial ingest endpoints.

## Integration Module Split

- `integrations/opensky/OpenSkyTokenClient.java`
- `integrations/opensky/OpenSkyPollingService.java`
- `integrations/usgs/UsgsPollingService.java`
- `integrations/celestrak/CelesTrakPollingService.java`
- `integrations/rainviewer/RainViewerPollingService.java`
- `integrations/geospatial/GeospatialIngestClient.java`

## Scheduling

Configured via `application.yml`:

- `vision.polling.enabled`
- `vision.polling.bootstrap-enabled`
- `vision.polling.interval-ms`

## Accuracy And Resilience Notes

- `OpenSkyPollingService`:
  - validates coordinate ranges before publishing records.
  - prefers barometric altitude and falls back to geometric altitude when missing.
- `CelesTrakPollingService`:
  - uses JDK `HttpClient` with explicit request/connect timeouts to avoid hanging poll cycles.
  - when direct coordinate fields are missing, derives an estimated current position from orbital element fields:
    - `INCLINATION`
    - `RA_OF_ASC_NODE`
    - `ARG_OF_PERICENTER`
    - `MEAN_ANOMALY`
    - `MEAN_MOTION`
    - `EPOCH`
  - skips records that cannot produce valid coordinates instead of publishing `0,0` fallback points.

## Operational Debug Checklist

1. Trigger one cycle:
   - `curl -s http://localhost:8084/api/v1/ingestion/run | jq`
2. Verify geospatial snapshot health:
   - `curl -s http://localhost:8083/api/v1/geospatial/snapshot | jq '.timestamp, (.flights|length), (.satellites|length), (.earthquakes|length)'`
3. Confirm gateway payloads seen by frontend:
   - `curl -s http://localhost:8082/api/v1/geospatial/flights | jq 'length'`
   - `curl -s http://localhost:8082/api/v1/geospatial/satellites | jq 'length'`
