# Changelog

## 0.2.13 - 2026-05-18

- Satellites runtime stabilization and validation:
  - verified live satellite data path on `localhost:8081` (`/api/v1/geospatial/satellites`)
  - advanced satellite mode remains in Satellite CFG (not as a separate layer item).
- Focus-mode behavior upgrades:
  - clicking empty globe while focused now releases focus and recenters Earth
  - focused entity isolation now hides surrounding air entities when focusing flights/military.
- CFG UX and scope cleanup:
  - removed separate `Advanced Satellites` layer row; moved advanced toggle into Satellite CFG
  - `Show Orbit` now satellite-only in CFG
  - satellite outline controls now satellite-only in CFG
  - compact controls (`marker size`, `opacity`, durations, etc.) kept in 2-column compact slider rows.
- Zoom control tuning while focused:
  - wheel zoom behavior now uses focused-aware scaling and bounded zoom amounts in crosshair mode.

## 0.2.12 - 2026-05-17

- Added new layer behavior controls for dynamic motion visualization:
  - `showTrail` + trail duration (minutes)
  - `showPath` + lead duration (minutes)
  - `showOrbit` + orbit duration (minutes, satellite-focused)
- Extended per-layer CFG panel so these controls are configurable live per layer.
- Added flight and military path/trail rendering using Cesium dynamic path + projected polyline.
- Added satellite orbit/path rendering option with configurable duration.
- Updated focus interaction:
  - clicking empty globe space while tracking now exits focus and recenters Earth
  - right-side flight info panel remains hidden; focus info is presented via the bottom-center card only.

## 0.2.11 - 2026-05-17

- Added full military flight pipeline powered by ADSB.lol:
  - new ingestion adapter: `apps/data-ingestion/.../adsblol/AdsbMilitaryPollingService.java`
  - new geospatial ingest route: `POST /api/v1/geospatial/ingest/military-flights`
  - new geospatial read route: `GET /api/v1/geospatial/military-flights`
  - new gateway route: `GET /api/v1/geospatial/military-flights`
  - military records now included in geospatial snapshots as a dedicated list.
- Added frontend military layer module:
  - `features/military-flights/hooks/useMilitaryFlightsLayer.ts`
  - `features/military-flights/services/militaryFlightLayerPresenter.ts`
  - `services/integrations/militaryFlightsService.ts`
- Upgraded flight/military icon rendering:
  - plane icons now use a more aircraft-like silhouette
  - heading-aware icon rotation for aircraft layers
  - improved military focus card/source labeling (`ADSB.lol Military`).
- Expanded per-layer CFG controls so layer visuals are deeply configurable:
  - marker opacity
  - outline enable/disable
  - outline color
  - outline width
  - applies to both dot and icon modes.

## 0.2.10 - 2026-05-17

- Fixed CCTV addon runtime stability on `localhost:8081` by adding a Vite `/api` proxy to `http://localhost:8082`.
- Hardened frontend API client fallback behavior:
  - first tries configured `VITE_API_BASE_URL`
  - falls back to same-origin `/api/...` when direct host fetch is unavailable.
- Improved flight layer startup responsiveness:
  - added fast bootstrap refresh loop so planes render shortly after viewer boot, then continue on normal polling.
- Increased default flight entity budget to render full OpenSky snapshots more reliably (`maxEntities` now defaults to `500` for flight layers).
- Upgraded CCTV monitor behavior:
  - camera cards act as a preview gallery layout
  - selecting/quick-view/fullscreen now flies the Cesium camera to the webcam coordinates and drops/updates a map pin
  - quick-view metadata panel now shows detailed location/status/view/updated information
  - periodic camera list refresh renews expiring tokenized webcam image URLs.

## 0.2.9 - 2026-05-17

- Added new Addons entry: `Public CCTV Monitor` in the left menu.
- Added full-screen addon panel experience for CCTV monitoring:
  - country, state/region, city, status, and sort controls
  - search by camera title
  - quick-view preview
  - fullscreen image launch
  - player link launch
  - load-more pagination and refresh controls
- Added backend CCTV proxy integration in `api-gateway`:
  - `GET /api/v1/addons/cctv/countries`
  - `GET /api/v1/addons/cctv/webcams`
  - `GET /api/v1/addons/cctv/webcams/{webcamId}`
- Added Windy Webcams API v3 integration module with secure `x-windy-api-key` server-side header injection.
- Added CCTV addon frontend service/types and runtime hook wiring.

## 0.2.8 - 2026-05-17

- Re-mapped runtime ports so the frontend now runs at `localhost:8081`.
- Updated service port layout:
  - `web-command`: `8081`
  - `api-gateway`: `8082`
  - `geospatial-service`: `8083`
  - `data-ingestion`: `8084`
- Updated default frontend API target to `http://localhost:8082`.
- Updated gateway and ingestion geospatial base URL defaults to `http://localhost:8083`.
- Updated `scripts/dev-stack.sh` preflight port checks to `8081-8084`.
- Updated `.env.local` defaults and runbook/documentation references for the new port map.

## 0.2.7 - 2026-05-14

- Data correctness hardening:
  - OpenSky mapper now validates latitude/longitude bounds before publishing.
  - OpenSky altitude now falls back to geometric altitude when barometric altitude is missing.
  - Satellite presenter now ignores invalid coordinates instead of rendering bad entities.
- CelesTrak integration reliability:
  - Switched poll transport to JDK `HttpClient` with explicit connect/request timeouts.
  - Added resilient JSON parsing for optional coordinate fields.
  - Added orbital-element fallback estimator (`INCLINATION`, `RA_OF_ASC_NODE`, `ARG_OF_PERICENTER`, `MEAN_ANOMALY`, `MEAN_MOTION`, `EPOCH`) so satellites are no longer published as `0,0`.
- Frontend performance reductions:
  - Lower default entity budgets and disable labels by default in layer config.
  - Prevent overlapping flight/satellite refresh requests (`refreshInFlight` guard).
  - Removed unbounded Cesium sampled-position growth by rebuilding short sampled segments each update.
  - Added distance-based culling for flight/satellite labels and icons.
  - Tuned Cesium preset frame-rate and resolution scale behavior for smoother runtime.

## 0.2.6 - 2026-05-14

- Centered startup camera updated to global Earth center view.
- Recenter now always restores centered Earth framing and clears tracked focus state.
- Improved photorealistic 3D tile quality defaults and strengthened quality preset behavior.
- Added dynamic terrain detail gate:
  - flat terrain in global view
  - detailed terrain only when camera is close to surface or tracking entities.
- Updated landmark search fly-to behavior to oblique rotated perspective for better place visibility (e.g., Eiffel Tower).
- Hardened addon panel layout so opened addons occupy the full left menu area and hide info banner to avoid panel glitches.

## 0.2.5 - 2026-05-14

- Added new Addons module: `Metadata Spoofing`.
- Added addon entry in left rail and a dedicated metadata analysis sub-panel UI.
- Added addon panel router hook:
  - `useLegacyAddonPanels` to open/close addon sub-panels from `data-addon-open`.
- Added EXIF extraction flow using `exifr`:
  - `features/addons/metadata-spoofing/exifMetadataService.ts`
  - `useLegacyMetadataSpoofingAddon` for upload/parse/render/copy/clear controls.
- Metadata addon renders:
  - summary cards (file/camera/capture/location)
  - structured EXIF tag list
  - raw metadata JSON.

## 0.2.4 - 2026-05-12

- Made visual style filters stackable (NVG/FLIR/NOIR/CRT/SPOTLIGHT can run together; NORMAL resets).
- Reordered layer navigation logic so `global-movement` is always the first section.
- Added group-level quick disable: clicking active layer-group title toggles all APIs/toggles in that group OFF/ON and applies gray `group-off` styling.
- Reworked world texture presets into 8 distinct options:
  - default
  - low-poly
  - tropical
  - deep-oceans
  - space-night
  - arctic
  - desert
  - volcanic
- Added real Cesium performance presets (`QUALITY`, `BALANCED`, `PERFORMANCE`) that now change resolution and 3D-tiles quality/runtime behavior.
- Increased photorealistic 3D-tiles quality controls (screen-space error tuning) and connected them to presets.
- Added place/address search geocoding service (`geocodingService.ts`) using Nominatim:
  - supports natural-language place names and raw `lat,lon`
  - flies camera to destination
  - drops/updates a theme-colored map pin
  - updates UI status with resolved name and precise coordinates.

## 0.2.3 - 2026-05-12

- Fixed Cesium presenter typing and runtime entity graphics assignments for stable Vite/TypeScript builds.
- Updated Cesium startup camera to default Earth view on load.
- Updated recenter flow so `earthRecenterBtn` resets tracked entity, camera heading/pitch/roll, and focus UI state.
- Added modular per-layer CFG system:
  - `features/layer-config/layerVisualConfig.ts`
  - `features/layer-config/iconFactory.ts`
  - `features/legacy-shell/hooks/useLegacyLayerConfigPanel.ts`
- Added per-layer configurable visuals (color, icon preset, max entities, marker size, label visibility) with live re-render events.
- Refactored flight rendering to in-place entity updates with smoothed motion and focused telemetry refresh.
- Added satellite layer runtime/render pipeline with toggles, focus support, and telemetry.
- Added anti-tunnel movement guard so large entity position jumps snap instead of interpolating through Earth.
- Updated frontend docs for camera reset and layer CFG behavior.

## 0.2.0 - 2026-05-12

- Added single-command runtime orchestration: `npm run dev` starts frontend + all backend services.
- Normalized local ports to support `localhost:8080` frontend entrypoint.
- Split ingestion integrations into separate provider modules:
  - OpenSky
  - USGS
  - CelesTrak
  - RainViewer
  - Geospatial ingest publisher
- Refactored API gateway to proxy geospatial data from geospatial-service.
- Split frontend API integrations into separate per-source files.
- Updated runbooks and module READMEs for the new orchestration flow.

## 0.1.0 - 2026-05-12

- Initialized Vision v3.0 monorepo with `apps/` + `packages/` structure.
- Implemented first-pass command-center frontend with Cesium integration.
- Scaffolded Spring Boot services and shared contracts.

## 0.2.1 - 2026-05-12

- Fixed UI typography parity by loading exact reference font stack in `apps/web-command/index.html`:
  - Orbitron (400/500/700/800)
  - Share Tech Mono
- Renamed top-level docs folder from `docs` to `doccumentation`.
- Rebuilt documentation into detailed, navigable sections:
  - getting started
  - architecture
  - per-app deep dives
  - frontend implementation guides
  - per-provider integration guides
  - API references and examples
  - operations runbooks
  - ADR records

## 0.2.2 - 2026-05-12

- Fixed CesiumJS runtime on Vite dev server:
  - added deterministic Cesium static asset sync script (`apps/web-command/scripts/sync-cesium-assets.mjs`)
  - wired `predev`/`prebuild` hooks so `Workers`, `Assets`, `ThirdParty`, and `Widgets` are always present at `/cesiumStatic`
  - set `window.CESIUM_BASE_URL` to `/cesiumStatic`
  - excluded `cesium` from Vite dep optimization to avoid worker prebundle path failures
- Refactored legacy shell interaction logic into modular runtime hooks:
  - `useLegacyShellUi`
  - `useLegacyShellFlightFocus`
  - `useLegacyShellRuntime`
- Enabled interactive behavior for command-center controls (style presets, layer toggles, config panel, profile/API/intel/recording/terminal panels, camera focus mode, custom accent presets, world texture presets, recenter/search)
- Added flight entity click-to-focus behavior with focus cards and release/focus controls.
- Updated flights layer behavior so the UI toggle for `flights` now controls live entity rendering.
