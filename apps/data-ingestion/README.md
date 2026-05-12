# Data Ingestion

Spring Boot scheduled ingestion service with source integrations split by provider.

## Integration Modules

- `integrations/opensky`: OpenSky OAuth2 token + flight polling.
- `integrations/usgs`: USGS earthquake feed polling.
- `integrations/celestrak`: CelesTrak active catalog polling.
- `integrations/rainviewer`: RainViewer radar frames polling.
- `integrations/geospatial`: push normalized records into geospatial-service.

`service/PollingOrchestrator` coordinates all modules and returns source-level polling results.
