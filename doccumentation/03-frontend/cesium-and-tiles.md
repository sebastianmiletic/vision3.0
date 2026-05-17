# Cesium and Tiles

## Viewer Initialization

`useCesiumViewer(containerId)` performs:

1. Optional Cesium ion token assignment.
2. Terrain provider creation via `createWorldTerrainAsync()`.
3. Viewer creation with nonessential Cesium widgets disabled.
4. Photorealistic tileset load through provider adapter.
5. Initial camera fly-to to a full-Earth default view (`lon=0`, `lat=18`, `alt=22,000km`).

## Cesium Static Asset Pipeline

- `apps/web-command/scripts/sync-cesium-assets.mjs` copies Cesium `Workers`, `Assets`, `ThirdParty`, and `Widgets` from the workspace `node_modules` into `public/cesiumStatic`.
- The sync runs automatically via:
  - `predev` (`npm run dev` path)
  - `prebuild` (`npm run build:web` path)
- `window.CESIUM_BASE_URL` is set to `/cesiumStatic`, ensuring terrain/worker JSON and JS files resolve to real assets instead of the SPA HTML fallback.

## Tile Provider Adapter

`features/globe/services/tileProvider.ts` supports:

- `google` (default): Google Map Tiles API root URL + API key.
- `cesium-ion` (fallback mode): Ion asset id `2275207`.

## Why Adapter First

- Keeps provider-switching isolated from viewer setup.
- Avoids cross-file refactors when adding more providers.
- Supports environment-driven provider selection (`VITE_TILE_PROVIDER`).

## Failure Behavior

- Missing Google key throws a clear runtime error.
- Initialization errors are logged by viewer hook catch block.
- Frontend remains structurally mounted for diagnostics even when tiles fail.

## Camera Reset Behavior

- Recenter button (`earthRecenterBtn`, next to FLIR mode) calls `window.__recenterEarth`.
- Reset action clears tracked entity, exits active focus state classes, and restores default Earth camera heading/pitch/roll.
- Runtime emits `vision:camera-reset` so focus hooks can clear stale tracked-entity bindings and UI detail panels.

## Performance Presets

- Top HUD presets now directly control Cesium runtime quality (`window.__applyPerformancePreset`):
  - `QUALITY`: higher resolution scale + low 3D tile screen-space error for sharper photorealistic tiles.
  - `BALANCED`: moderate quality/performance tradeoff (default active preset).
  - `PERFORMANCE`: lower resolution scale + higher screen-space error for FPS.
- `QUALITY` is now the default active preset at startup.

## Terrain Detail Gate

- Default globe starts in centered world view with flat terrain profile to avoid unnecessary close-range terrain detail noise.
- Detailed terrain is now gated:
  - enabled when tracking entities (plane/satellite focus), or
  - enabled when camera altitude is very close to Earth.
- Recenter resets back to centered world view and returns terrain mode to default flat profile.

## Landmark Search Camera

- Place search (`Eiffel Tower`, landmarks, or coordinates) now flies to an oblique heading/pitch/range perspective rather than top-down.
- Result: landmarks are immediately visible in a rotated cinematic framing.

## Filter Stacking

- Style presets (CRT, NVG, NOIR, SPOTLIGHT, FLIR) are now stackable.
- `NORMAL` acts as a reset state (clears stacked filters).
- FLIR no longer hard-overrides the full canvas filter chain; it contributes through shared shader variables so combinations like `NVG + FLIR` work.
