# Web Command App

React + Vite command-center UI with Cesium globe center and tactical side panels.

## Structure

- `src/features/globe`: Cesium viewer, provider adapter, camera hooks.
- `src/services/integrations`: isolated frontend API integrations per data source.
- `src/components/layout`: command center shell.
- `src/stores`: Zustand global UI state.

## Run

Use repo root command:

- `npm run dev`

Then open `http://localhost:8080`.
