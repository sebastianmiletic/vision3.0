# ADR 0002: Google Map Tiles API as Default Photorealistic Provider

## Status
Accepted

## Decision
Default Cesium photorealistic tiles integration uses Google Map Tiles API root tileset URL with API key.

## Rationale
- Aligns with product requirement for Google photorealistic 3D tiles.
- Keeps Cesium ion token optional for future capabilities.
- Provider adapter allows later fallback mode without major refactor.
