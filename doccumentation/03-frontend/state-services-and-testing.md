# Frontend State, Services, and Testing

## State

`stores/appStore.ts` (Zustand):

- theme state (`accent`, `panelOpacity`, `mode`)
- layer toggle state
- actions:
  - `setTheme(partial)`
  - `toggleLayer(layer)`

## API Service Split

Each integration is isolated:

- `services/integrations/flightsService.ts`
- `services/integrations/militaryFlightsService.ts`
- `services/integrations/earthquakesService.ts`
- `services/integrations/satellitesService.ts`
- `services/integrations/weatherService.ts`
- `services/integrations/marketsService.ts`
- `services/integrations/geocodingService.ts`
- `services/integrations/cctvService.ts`

All use shared fetch helper `services/apiClient.ts`.

`services/apiClient.ts` behavior:

- Uses `VITE_API_BASE_URL` when provided.
- Falls back to same-origin `/api/...` fetch when direct base URL fetch is unavailable.
- Enables stable local usage on `http://localhost:8081` with Vite proxying.

## Flight Rendering Pipeline

- Hook: `features/flights/hooks/useFlightsLayer.ts`
- Fetch: `fetchFlights()`
- Present: `renderFlights(viewer, flights)`
- Telemetry: `setFlightUiStatus(...)`
- Runtime toggle integration:
  - the shell `data-toggle="flights"` control now directly gates entity rendering in `useFlightsLayer`.

## Military Flight Rendering Pipeline

- Hook: `features/military-flights/hooks/useMilitaryFlightsLayer.ts`
- Fetch: `fetchMilitaryFlights()`
- Present: `renderMilitaryFlights(viewer, flights)`
- Telemetry: `setMilitaryFlightUiStatus(...)`
- Runtime toggle integration:
  - shell `data-toggle="military"` directly controls military layer rendering.

## Satellite Rendering Pipeline

- Hook: `features/satellites/hooks/useSatellitesLayer.ts`
- Fetch: `fetchSatellites()`
- Present: `renderSatellites(viewer, satellites)`
- Telemetry: `setSatelliteUiStatus(...)`
- Runtime toggle integration:
  - shell `data-toggle="satellites"` directly controls whether entities are rendered.

## Layer CFG System

- Shared config state:
  - `features/layer-config/layerVisualConfig.ts`
  - `features/layer-config/iconFactory.ts`
- UI runtime hook:
  - `features/legacy-shell/hooks/useLegacyLayerConfigPanel.ts`
- Each data layer row `CFG` button opens one reusable panel with per-layer settings:
  - color
  - icon preset (dot/plane/satellite)
  - max entities rendered
  - marker size
  - marker opacity
  - outline enabled/disabled
  - outline color
  - outline width
  - trail toggle + trail duration (minutes)
  - path toggle + lead duration (minutes)
  - orbit toggle + duration (minutes)
  - label visibility
- Applying changes emits `vision:layer-config-changed`; active layer hooks re-render immediately.

## Legacy Shell Runtime Controllers

Shell controls are split into dedicated hooks instead of a single monolithic runtime file:

- `features/legacy-shell/hooks/useLegacyShellUi.ts`
  - panel open/close controls
  - style/preset/theme/slider behaviors
  - stackable visual filter toggles (`NVG`, `FLIR`, etc.)
  - group-level layer kill switch (`group-off`) via active group title click
  - layer group navigation
  - map mode + recenter
- `features/legacy-shell/hooks/useLegacyShellFlightFocus.ts`
  - Cesium entity click pick handler
  - focus card and detail panel binding for flights, military flights, and satellites
  - continuous focused-entity data refresh while tracked
  - click-off behavior recenters Earth and exits tracked focus
  - right-side flight panel stays hidden; bottom-center focus card is the active info surface
- `features/legacy-shell/hooks/useLegacyLayerConfigPanel.ts`
  - reusable CFG panel for all layer rows
- `features/legacy-shell/hooks/useLegacyLocationSearch.ts`
  - address/place geocoding + lat/lon parsing
  - fly camera to resolved destination
  - add/update theme-colored location pin entity
  - write resolved coordinates to status/inspector fields
- `features/legacy-shell/hooks/useLegacyAddonPanels.ts`
  - routes `data-addon-open` actions to addon sub-panels
  - handles addon panel close/back behavior and returns to layers panel
- `features/legacy-shell/hooks/useLegacyMetadataSpoofingAddon.ts`
  - upload image file
  - parse EXIF metadata
  - render summary cards, structured tag list, and raw JSON view
  - copy JSON and clear state controls
- `features/legacy-shell/hooks/useLegacyCctvAddon.ts`
  - fetches CCTV countries and paged webcam feeds
  - applies country/region/city/status/sort/search filters
  - renders gallery-style camera cards
  - on camera click/quick-view/fullscreen: updates quick-view card and flies globe to exact webcam coordinates
  - refreshes tokenized image URLs periodically to prevent stale preview links
- `features/legacy-shell/hooks/useLegacyShellRuntime.ts`
  - composition entrypoint for runtime hooks

## Metadata Spoofing Addon

- UI lives in the left rail addon panel (`metadataSpoofingPanel`).
- Parsing module:
  - `features/addons/metadata-spoofing/exifMetadataService.ts`
- Library:
  - `exifr` (browser-side EXIF parser)
- Outputs:
  - file/camera/location summary
  - full key-value EXIF tag table
  - raw JSON payload for operator workflows

## Tests

- Unit and service tests:
  - `features/globe/services/tileProvider.test.ts`
  - `stores/appStore.test.ts`
- E2E shell checks:
  - `test/e2e/command-layout.spec.ts`
