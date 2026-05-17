# Data Ingestion

Spring Boot scheduled ingestion service with source integrations split by provider.

## Integration Modules

- `integrations/opensky`: OpenSky OAuth2 token + flight polling.
- `integrations/adsblol`: ADSB.lol military aircraft polling.
- `integrations/usgs`: USGS earthquake feed polling.
- `integrations/celestrak`: CelesTrak active catalog polling.
- `integrations/rainviewer`: RainViewer radar frames polling.
- `integrations/geospatial`: push normalized records into geospatial-service.

`service/PollingOrchestrator` coordinates all modules and returns source-level polling results.

## Detailed Docs

- `../../doccumentation/02-apps/data-ingestion.md`
- `../../doccumentation/04-integrations/`
- `../../doccumentation/06-runbooks/troubleshooting.md`
