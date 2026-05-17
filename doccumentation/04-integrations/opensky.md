# Integration: OpenSky

## Purpose

Ingest live aircraft states for the flight layer.

## Required Credentials

- `VISION_INTEGRATIONS_OPENSKY_CLIENT_ID`
- `VISION_INTEGRATIONS_OPENSKY_CLIENT_SECRET`

## Module Split

- `OpenSkyTokenClient`: OAuth2 access token request.
- `OpenSkyPollingService`: source poll + normalization.

## Data Path

OpenSky -> `data-ingestion` -> `geospatial-service` ingest -> `api-gateway` -> frontend flights layer.

## Operational Notes

- Ingestion failures are isolated and do not stop other sources.
- Frontend flight polling retries every interval from `useFlightsLayer`.
