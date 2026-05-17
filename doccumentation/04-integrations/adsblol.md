# ADSB.lol Integration

## Purpose

Provide a dedicated military flight layer independent from the OpenSky civilian feed.

## Source

- Base URL: `https://api.adsb.lol`
- Endpoint used: `GET /v2/mil`
- Payload section consumed: `ac[]`

## Runtime Path

1. `data-ingestion` polls ADSB.lol military aircraft:
   - `integrations/adsblol/AdsbMilitaryPollingService.java`
2. records are normalized to `FlightTrack` shape.
3. records are ingested to geospatial service:
   - `POST /api/v1/geospatial/ingest/military-flights`
4. geospatial-service stores military list separately in snapshot.
5. api-gateway exposes:
   - `GET /api/v1/geospatial/military-flights`
6. frontend renders military entities through:
   - `features/military-flights/*`

## Mapping Notes

- `hex` -> `id` as `mil-{hex}`
- `flight` (or fallback `MIL-{HEX}`) -> `callsign`
- `lat` / `lon` -> coordinates
- `alt_baro` / `alt_geom` feet -> meters
- `gs` (knots) -> `speedKnots`
- `track` (or `true_heading`) -> `headingDegrees`

## Ops Notes

- No API key is currently required for this integration path.
- Endpoint health quick check:
  - `curl -s http://localhost:8082/api/v1/geospatial/military-flights | jq 'length'`
