# App: web-command

## Purpose

Browser command center UI with CesiumJS globe in the middle and legacy shell controls around it.

## Entry Points

- `src/main.tsx`: React bootstrap.
- `src/App.tsx`: top-level shell mount.
- `src/features/legacy-shell/VisionLegacyShell.tsx`: UI section composition.
- `src/features/globe/components/GlobeViewport.tsx`: Cesium host mount.

## Key Modules

- Globe
  - `features/globe/hooks/useCesiumViewer.ts`
  - `features/globe/services/tileProvider.ts`
- Flights
  - `features/flights/hooks/useFlightsLayer.ts`
  - `features/flights/services/flightLayerPresenter.ts`
  - `services/integrations/flightsService.ts`
- Shared state
  - `stores/appStore.ts`
- Addons
  - `features/legacy-shell/hooks/useLegacyMetadataSpoofingAddon.ts`
  - `features/legacy-shell/hooks/useLegacyCctvAddon.ts`
  - `services/integrations/cctvService.ts`

## UI Sectioning

The legacy UI is split into static section files loaded by React wrappers:

- `features/legacy-shell/sections/boot.html`
- `features/legacy-shell/sections/hud-and-overlays.html`
- `features/legacy-shell/sections/left-rail.html`
- `features/legacy-shell/sections/right-rail.html`
- `features/legacy-shell/sections/bottom-and-modals.html`
- `features/legacy-shell/sections/floating-panels.html`

## Styling

- `src/styles.css` imports `styles/legacy/legacy-all.css`.
- Legacy style sheet is also split into individual source slices:
  - `01-core.css` to `07-responsive.css`.
- Font stack follows reference UI:
  - `Orbitron`
  - `Share Tech Mono`

## Runtime Dependencies

- Reads from `api-gateway` (`http://localhost:8082` by default).
- Uses Google Map Tiles API key for photorealistic 3D tiles.
- CCTV addon uses `api-gateway` proxy endpoints and does not expose the Windy API key to the browser.

## Performance Controls

- Cesium performance presets are wired in `features/globe/hooks/useCesiumViewer.ts`:
  - `quality`: higher resolution scale and tile quality.
  - `balanced`: moderate resolution and LOD.
  - `performance`: lower render scale and more aggressive LOD skipping.
- Layer budgets are centralized in `features/layer-config/layerVisualConfig.ts`:
  - defaults reduced for smoother frame pacing.
  - labels are disabled by default to avoid heavy text rendering overhead.
- Flight and satellite polling hooks prevent overlapping refreshes via per-layer `refreshInFlight` guards.

## Data Correctness Guards

- `flightLayerPresenter.ts` and `satelliteLayerPresenter.ts` now:
  - reject invalid coordinate payloads before entity updates.
  - avoid rendering malformed points that drift to `0,0`.
- Presenter smoothing now rebuilds short sampled trajectory segments each refresh, preventing long-session memory/CPU growth from unbounded `SampledPositionProperty` history.
