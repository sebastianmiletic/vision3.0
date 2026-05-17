# UI Shell Reference

## Goal

Match the reference command-center layout with the Cesium viewport in the center and operational UI rails around it.

## Composition Model

`VisionLegacyShell` composes discrete HTML sections so each shell area can evolve independently:

- Boot and startup overlays
- Top HUD/status row
- Left rail data layers panel
- Right rail style/parameter panel
- Bottom mode/search dock
- Floating panels and modal containers

## Why Section Files

- Avoids a single large "god file".
- Enables precise parity work per screen region.
- Keeps component boundaries aligned with visual geometry.

## Typography Fidelity

The shell relies on two fonts from Google Fonts:

- `Orbitron`
- `Share Tech Mono`

They are loaded in `apps/web-command/index.html` so CSS declarations in legacy style modules resolve to the same typeface family as the reference UI.

## Runtime Interactions

- World texture presets provide 8 distinct globe looks:
  - `default`
  - `low-poly`
  - `tropical`
  - `deep-oceans`
  - `space-night`
  - `arctic`
  - `desert`
  - `volcanic`
- Clicking the active layer-group title toggles the whole group offline/online and syncs each member API toggle.
