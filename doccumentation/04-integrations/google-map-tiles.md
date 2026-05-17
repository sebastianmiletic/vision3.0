# Integration: Google Photorealistic 3D Tiles

## Purpose

Render the globe scene with photorealistic 3D map tiles in Cesium.

## Configuration

- Environment variable: `VITE_GOOGLE_MAPS_API_KEY`
- Provider mode: `VITE_TILE_PROVIDER=google` (default)

## Implementation

- URL root: `https://tile.googleapis.com/v1/3dtiles/root.json`
- Key passed as `?key=...`
- Loader function: `createPhotorealisticTileset()`

## Notes

- Map Tiles API must be enabled in Google Cloud project.
- Billing must be active for production-scale usage.
- If key is missing, tile provider module throws explicit error.
