# Web Command App

React + Vite command-center UI with Cesium globe center and tactical side panels.

## Structure

- `src/features/globe`: Cesium viewer, provider adapter, camera hooks.
- `src/features/legacy-shell`: split UI shell section files and composition wrapper.
- `src/features/legacy-shell/hooks`: modular shell runtime controllers for interactivity.
- `src/features/addons/metadata-spoofing`: EXIF metadata extraction logic for the Metadata Spoofing addon.
- `src/features/addons/cctv`: CCTV addon data contracts and monitor types.
- `src/features/flights`: flight polling + Cesium entity mapping.
- `src/features/military-flights`: ADSB.lol military polling + Cesium entity mapping.
- `src/features/satellites`: satellite polling + Cesium entity mapping.
- `src/features/layer-config`: per-layer CFG state (color, icon preset, limits, labels, opacity, outline controls).
- `src/services/integrations`: isolated frontend API integrations per data source.
- `src/services/integrations/geocodingService.ts`: place-name geocoding for search/fly/pin workflow.
- `src/stores`: Zustand global UI state.

## Run

Use repo root command:

- `npm run dev`

Then open `http://localhost:8081`.

`predev` automatically syncs Cesium static runtime assets into `public/cesiumStatic`.

## Detailed Docs

- `../../doccumentation/03-frontend/ui-shell-reference.md`
- `../../doccumentation/03-frontend/cesium-and-tiles.md`
- `../../doccumentation/03-frontend/state-services-and-testing.md`
