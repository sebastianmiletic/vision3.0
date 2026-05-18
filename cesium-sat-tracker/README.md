# cesium-sat-tracker

A complete CesiumJS + satellite.js project that tracks real satellites in real time using live TLE data from CelesTrak public endpoints.

## Features

- CesiumJS globe with OpenStreetMap imagery and free ellipsoid terrain (no Cesium Ion token required)
- Fetches TLE data from CelesTrak public `gp.php` endpoints
- Uses `satellite.js` SGP4 propagation in browser
- Real-time moving satellites
- Orbit trail/path rendering (90-minute forward samples)
- Multiple satellite groups (`active`, `starlink`, `gps-ops`, `weather`)
- Simulation controls:
  - Pause / Play
  - Time multipliers `1x`, `10x`, `100x`, `1000x`
- Satellite search by name
- Scrollable satellite list with per-satellite visibility toggles
- Click Track button to fly to and track a satellite (`viewer.trackedEntity`)
- Labels show satellite name + altitude + lat/lon
- Graceful error handling if CelesTrak is unavailable

## Project Structure

```text
/cesium-sat-tracker
  /public
    index.html
    style.css
  /src
    main.js
    cesiumSetup.js
    tleFetcher.js
    satelliteTracker.js
    uiControls.js
    utils.js
  package.json
  vite.config.js
  README.md
```

## Setup

1. Open a terminal in the project directory:

```bash
cd "/Users/sebastianmiletic/Coding/Delta Labs/Vision v3.0/cesium-sat-tracker"
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open the URL printed by Vite (typically `http://localhost:5173`).

## How it works

### 1. Cesium viewer setup

`src/cesiumSetup.js` creates a `Cesium.Viewer` with:

- timeline and animation enabled
- lighting + atmosphere enabled
- `Clock` multiplier support for simulation speed controls
- `OpenStreetMapImageryProvider`
- `EllipsoidTerrainProvider`

### 2. CelesTrak TLE loading

`src/tleFetcher.js` fetches group TLE data from:

```text
https://celestrak.org/NORAD/elements/gp.php?GROUP=<groupName>&FORMAT=tle
```

Example:

```text
https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle
```

The parser reads TLE data as 3-line chunks:

1. satellite name line
2. TLE line 1
3. TLE line 2

### 3. Orbit propagation

`src/satelliteTracker.js` converts TLE lines to `satrec`:

- `satellite.twoline2satrec(line1, line2)`

Then on each render/time evaluation:

- `satellite.propagate(satrec, date)` for ECI position
- `satellite.gstime(date)` for GMST
- `satellite.eciToGeodetic(positionEci, gmst)` for geodetic coordinates
- radians to degrees conversion
- `Cesium.Cartesian3.fromDegrees(lonDeg, latDeg, altitudeMeters)` for globe position

### 4. Orbit path generation

For each satellite, a `SampledPositionProperty` is sampled forward for 90 minutes using 30-second steps.

- The resulting positions power the visible orbit path (`entity.path`)
- Orbit visibility can be toggled from UI

### 5. Performance model

- Default load limit is `200` satellites to avoid lag
- Limit can be increased with the `Limit` dropdown and `Load Group`
- Search/filter operates on loaded satellites only

## UI usage

- **Satellite group**: choose `active`, `starlink`, `gps-ops`, or `weather`
- **Load Group**: fetches and renders selected group with selected limit
- **Pause/Play**: pauses/resumes Cesium clock animation
- **Speed buttons**: choose 1x/10x/100x/1000x simulation rate
- **Hide/Show Orbits**: toggles orbit path display
- **Search**: filters satellite list by name
- **List buttons**:
  - `Hide/Show` toggles satellite visibility
  - `Track` flies camera to satellite and sets `viewer.trackedEntity`

## Notes

- No Cesium Ion token is needed.
- No paid APIs/services are used.
- All satellite data is pulled from public CelesTrak endpoints.

