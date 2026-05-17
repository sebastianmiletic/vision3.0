# ADR 0002: Google Map Tiles API as Default Photorealistic Provider

## Status

Accepted

## Decision

Default Cesium photorealistic tiles integration uses Google Map Tiles API root tileset URL with API key.

## Rationale

- Aligns with requirement for Google photorealistic 3D tiles.
- Keeps Cesium ion token optional for future capabilities.
- Provider adapter enables fallback mode without broad refactor.

## Consequences

- Local and production environments require a valid Google Map Tiles API key.
- Tile failures are likely configuration-related (key, API enablement, billing), so troubleshooting docs are essential.
