import { useEffect } from 'react';

import { getLayerVisualConfig, setLayerVisualConfig } from '../../layer-config/layerVisualConfig';
import { setHidden, setText } from '../utils/domUi';

import type { LayerIconPreset } from '../../layer-config/layerVisualConfig';

const MAX_ENTITIES_MIN = 1;
const MAX_ENTITIES_MAX = 5000;
const MARKER_SIZE_MIN = 2;
const MARKER_SIZE_MAX = 24;
const MARKER_OPACITY_MIN = 0.1;
const MARKER_OPACITY_MAX = 1;
const OUTLINE_WIDTH_MIN = 0;
const OUTLINE_WIDTH_MAX = 6;
const TRAIL_MINUTES_MIN = 1;
const TRAIL_MINUTES_MAX = 240;
const PATH_LEAD_MINUTES_MIN = 1;
const PATH_LEAD_MINUTES_MAX = 240;
const ORBIT_MINUTES_MIN = 1;
const ORBIT_MINUTES_MAX = 240;

type LayerConfigProfile = {
  title: string;
  source: string;
  endpoint: string;
  note: string;
  allowApply: boolean;
  showIconPreset: boolean;
  iconOptions: LayerIconPreset[];
  showAdvancedSatellites: boolean;
  showOutlineControls: boolean;
  outlineLabel: string;
  showTrailControls: boolean;
  trailLabel: string;
  showPathControls: boolean;
  pathLabel: string;
  showOrbitControls: boolean;
  orbitLabel: string;
  showLabelControl: boolean;
  labelToggleText: string;
  maxEntitiesLabel: string;
  markerSizeLabel: string;
  markerOpacityLabel: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sliderPercent(value: number, min: number, max: number) {
  if (max <= min) {
    return 0;
  }
  return Math.round(((value - min) / (max - min)) * 100);
}

function updateSliderReadouts() {
  const maxEntitiesInput = document.getElementById('cfgMaxEntities') as HTMLInputElement | null;
  const markerSizeInput = document.getElementById('cfgMarkerSize') as HTMLInputElement | null;
  const markerOpacityInput = document.getElementById('cfgMarkerOpacity') as HTMLInputElement | null;
  const outlineWidthInput = document.getElementById('cfgOutlineWidth') as HTMLInputElement | null;
  const trailMinutesInput = document.getElementById('cfgTrailMinutes') as HTMLInputElement | null;
  const pathLeadMinutesInput = document.getElementById('cfgPathLeadMinutes') as HTMLInputElement | null;
  const orbitMinutesInput = document.getElementById('cfgOrbitMinutes') as HTMLInputElement | null;
  const maxEntitiesValue = document.getElementById('cfgMaxEntitiesValue');
  const markerSizeValue = document.getElementById('cfgMarkerSizeValue');
  const markerOpacityValue = document.getElementById('cfgMarkerOpacityValue');
  const outlineWidthValue = document.getElementById('cfgOutlineWidthValue');
  const trailMinutesValue = document.getElementById('cfgTrailMinutesValue');
  const pathLeadMinutesValue = document.getElementById('cfgPathLeadMinutesValue');
  const orbitMinutesValue = document.getElementById('cfgOrbitMinutesValue');

  if (maxEntitiesInput && maxEntitiesValue) {
    const maxEntities = clamp(Number(maxEntitiesInput.value), MAX_ENTITIES_MIN, MAX_ENTITIES_MAX);
    const loadPct = sliderPercent(maxEntities, MAX_ENTITIES_MIN, MAX_ENTITIES_MAX);
    maxEntitiesValue.textContent = `${maxEntities.toLocaleString()} · ${loadPct}%`;
  }

  if (markerSizeInput && markerSizeValue) {
    const markerSize = clamp(Number(markerSizeInput.value), MARKER_SIZE_MIN, MARKER_SIZE_MAX);
    const markerPct = sliderPercent(markerSize, MARKER_SIZE_MIN, MARKER_SIZE_MAX);
    markerSizeValue.textContent = `${markerPct}% · ${markerSize}px`;
  }

  if (markerOpacityInput && markerOpacityValue) {
    const markerOpacity = clamp(Number(markerOpacityInput.value), MARKER_OPACITY_MIN, MARKER_OPACITY_MAX);
    const markerPct = sliderPercent(markerOpacity, MARKER_OPACITY_MIN, MARKER_OPACITY_MAX);
    markerOpacityValue.textContent = `${markerPct}% · ${markerOpacity.toFixed(2)}`;
  }

  if (outlineWidthInput && outlineWidthValue) {
    const outlineWidth = clamp(Number(outlineWidthInput.value), OUTLINE_WIDTH_MIN, OUTLINE_WIDTH_MAX);
    const outlinePct = sliderPercent(outlineWidth, OUTLINE_WIDTH_MIN, OUTLINE_WIDTH_MAX);
    outlineWidthValue.textContent = `${outlinePct}% · ${outlineWidth.toFixed(1)}px`;
  }

  if (trailMinutesInput && trailMinutesValue) {
    const trailMinutes = clamp(Number(trailMinutesInput.value), TRAIL_MINUTES_MIN, TRAIL_MINUTES_MAX);
    trailMinutesValue.textContent = `${trailMinutes.toFixed(0)} min`;
  }

  if (pathLeadMinutesInput && pathLeadMinutesValue) {
    const pathLeadMinutes = clamp(Number(pathLeadMinutesInput.value), PATH_LEAD_MINUTES_MIN, PATH_LEAD_MINUTES_MAX);
    pathLeadMinutesValue.textContent = `${pathLeadMinutes.toFixed(0)} min`;
  }

  if (orbitMinutesInput && orbitMinutesValue) {
    const orbitMinutes = clamp(Number(orbitMinutesInput.value), ORBIT_MINUTES_MIN, ORBIT_MINUTES_MAX);
    orbitMinutesValue.textContent = `${orbitMinutes.toFixed(0)} min`;
  }
}

function formatLayerName(layer: string) {
  return layer
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isLayerConfigPanelOpen() {
  const panel = document.getElementById('layerConfigPanel');
  if (!panel) {
    return false;
  }

  return !panel.classList.contains('hidden');
}

function resolveLayerSourceInfo(layer: string) {
  switch (layer) {
    case 'earthquakes':
      return { source: 'USGS via Geospatial Snapshot', endpoint: '/api/v1/geospatial/earthquakes' };
    case 'weather':
      return { source: 'Radar frames via Geospatial Snapshot', endpoint: '/api/v1/geospatial/weather/radar-frames' };
    case 'weatherWind':
      return { source: 'Wind simulation', endpoint: 'No dedicated renderer endpoint wired yet' };
    case 'rainSystems':
      return { source: 'Rain system overlays', endpoint: 'No dedicated renderer endpoint wired yet' };
    case 'ships':
      return { source: 'AIS/Maritime feed', endpoint: 'No dedicated renderer endpoint wired yet' };
    case 'trains':
      return { source: 'Rail feed', endpoint: 'No dedicated renderer endpoint wired yet' };
    case 'traffic':
      return { source: 'OpenStreet traffic particles', endpoint: 'No dedicated renderer endpoint wired yet' };
    default:
      return { source: 'API layer', endpoint: 'Not wired to a runtime layer renderer yet' };
  }
}

function getLayerConfigProfile(layer: string): LayerConfigProfile {
  switch (layer) {
    case 'flights':
      return {
        title: 'LIVE FLIGHTS',
        source: 'OpenSky Network',
        endpoint: '/api/v1/geospatial/flights',
        note: 'Optimized for aircraft tracks with heading projection and historical trails.',
        allowApply: true,
        showIconPreset: true,
        iconOptions: ['dot', 'plane'],
        showAdvancedSatellites: false,
        showOutlineControls: true,
        outlineLabel: 'Aircraft Outline',
        showTrailControls: true,
        trailLabel: 'Show Trail',
        showPathControls: true,
        pathLabel: 'Show Predicted Path',
        showOrbitControls: false,
        orbitLabel: 'Show Orbit',
        showLabelControl: true,
        labelToggleText: 'Show Callsign Label',
        maxEntitiesLabel: 'Max Aircraft',
        markerSizeLabel: 'Aircraft Marker Size',
        markerOpacityLabel: 'Aircraft Marker Opacity',
      };
    case 'military':
      return {
        title: 'MILITARY FLIGHTS',
        source: 'ADSB.lol Military',
        endpoint: '/api/v1/geospatial/military-flights',
        note: 'Military flights use the same motion model as air tracks with focused density limits.',
        allowApply: true,
        showIconPreset: true,
        iconOptions: ['dot', 'plane'],
        showAdvancedSatellites: false,
        showOutlineControls: true,
        outlineLabel: 'Aircraft Outline',
        showTrailControls: true,
        trailLabel: 'Show Trail',
        showPathControls: true,
        pathLabel: 'Show Predicted Path',
        showOrbitControls: false,
        orbitLabel: 'Show Orbit',
        showLabelControl: true,
        labelToggleText: 'Show Callsign Label',
        maxEntitiesLabel: 'Max Aircraft',
        markerSizeLabel: 'Aircraft Marker Size',
        markerOpacityLabel: 'Aircraft Marker Opacity',
      };
    case 'satellites':
      return {
        title: 'SATELLITES',
        source: 'CelesTrak',
        endpoint: '/api/v1/geospatial/satellites',
        note: 'Advanced mode queries /satellites?advanced=true and increases update frequency.',
        allowApply: true,
        showIconPreset: true,
        iconOptions: ['dot', 'satellite'],
        showAdvancedSatellites: true,
        showOutlineControls: true,
        outlineLabel: 'Satellite Outline',
        showTrailControls: true,
        trailLabel: 'Show Trail',
        showPathControls: true,
        pathLabel: 'Show Predicted Path',
        showOrbitControls: true,
        orbitLabel: 'Show Orbit',
        showLabelControl: true,
        labelToggleText: 'Show Satellite Label',
        maxEntitiesLabel: 'Max Satellites',
        markerSizeLabel: 'Satellite Marker Size',
        markerOpacityLabel: 'Satellite Marker Opacity',
      };
    case 'bordersLabels':
      return {
        title: 'BORDERS + LABELS',
        source: 'Natural Earth',
        endpoint: 'geojson/ne_110m_admin_0_boundary_lines_land + geojson/ne_110m_populated_places_simple',
        note: 'Borders and place labels are static feeds; labels are scored by rank/population before display.',
        allowApply: true,
        showIconPreset: false,
        iconOptions: [],
        showAdvancedSatellites: false,
        showOutlineControls: true,
        outlineLabel: 'Show Borders',
        showTrailControls: false,
        trailLabel: 'Show Trail',
        showPathControls: false,
        pathLabel: 'Show Predicted Path',
        showOrbitControls: false,
        orbitLabel: 'Show Orbit',
        showLabelControl: true,
        labelToggleText: 'Show Place Labels',
        maxEntitiesLabel: 'Max Place Labels',
        markerSizeLabel: 'Label Font Size',
        markerOpacityLabel: 'Border/Label Opacity',
      };
    default: {
      const fallback = resolveLayerSourceInfo(layer);
      return {
        title: formatLayerName(layer),
        source: fallback.source,
        endpoint: fallback.endpoint,
        note: 'No live renderer currently consumes visual config for this layer, so there are no adjustable controls yet.',
        allowApply: false,
        showIconPreset: false,
        iconOptions: [],
        showAdvancedSatellites: false,
        showOutlineControls: false,
        outlineLabel: 'Outline',
        showTrailControls: false,
        trailLabel: 'Show Trail',
        showPathControls: false,
        pathLabel: 'Show Predicted Path',
        showOrbitControls: false,
        orbitLabel: 'Show Orbit',
        showLabelControl: false,
        labelToggleText: 'Show Label',
        maxEntitiesLabel: 'Max Entities',
        markerSizeLabel: 'Marker Size',
        markerOpacityLabel: 'Marker Opacity',
      };
    }
  }
}

function renderConfigHtml(layer: string) {
  const profile = getLayerConfigProfile(layer);
  const config = getLayerVisualConfig(layer);
  const maxEntities = clamp(config.maxEntities, MAX_ENTITIES_MIN, MAX_ENTITIES_MAX);
  const markerSize = clamp(config.markerSize, MARKER_SIZE_MIN, MARKER_SIZE_MAX);
  const markerOpacity = clamp(config.markerOpacity, MARKER_OPACITY_MIN, MARKER_OPACITY_MAX);
  const outlineWidth = clamp(config.outlineWidth, OUTLINE_WIDTH_MIN, OUTLINE_WIDTH_MAX);
  const trailMinutes = clamp(config.trailMinutes, TRAIL_MINUTES_MIN, TRAIL_MINUTES_MAX);
  const pathLeadMinutes = clamp(config.pathLeadMinutes, PATH_LEAD_MINUTES_MIN, PATH_LEAD_MINUTES_MAX);
  const orbitMinutes = clamp(config.orbitMinutes, ORBIT_MINUTES_MIN, ORBIT_MINUTES_MAX);
  const maxEntitiesPct = sliderPercent(maxEntities, MAX_ENTITIES_MIN, MAX_ENTITIES_MAX);
  const markerSizePct = sliderPercent(markerSize, MARKER_SIZE_MIN, MARKER_SIZE_MAX);
  const markerOpacityPct = sliderPercent(markerOpacity, MARKER_OPACITY_MIN, MARKER_OPACITY_MAX);
  const outlineWidthPct = sliderPercent(outlineWidth, OUTLINE_WIDTH_MIN, OUTLINE_WIDTH_MAX);

  return `
    <div class="cfg-shell">
      <p class="cfg-note">${profile.note}</p>
      <div class="cfg-summary" aria-live="polite">
        <span>SOURCE: ${profile.source}</span>
        <span>ENDPOINT: ${profile.endpoint}</span>
      </div>
      <div class="cfg-grid">
        <label class="cfg-field">
          <span class="cfg-field-label">Color</span>
          <input id="cfgColor" type="color" value="${config.color}" />
        </label>
        ${profile.showIconPreset ? `
        <label class="cfg-field">
          <span class="cfg-field-label">Icon Preset</span>
          <select id="cfgIconPreset">
            ${profile.iconOptions.map((icon) => `<option value="${icon}" ${config.iconPreset === icon ? 'selected' : ''}>${icon.toUpperCase()}</option>`).join('')}
          </select>
        </label>
        ` : ''}
        ${profile.showAdvancedSatellites ? `
        <label class="cfg-field inline-check">
          <input id="cfgSatelliteAdvanced" type="checkbox" ${config.advancedSatellites ? 'checked' : ''} />
          <span class="cfg-field-label">Advanced Satellites</span>
        </label>
        ` : ''}
        ${profile.showOutlineControls ? `
        <label class="cfg-field">
          <span class="cfg-field-label">Outline Color</span>
          <input id="cfgOutlineColor" type="color" value="${config.outlineColor}" />
        </label>
        <label class="cfg-field inline-check">
          <input id="cfgOutlineEnabled" type="checkbox" ${config.outlineEnabled ? 'checked' : ''} />
          <span class="cfg-field-label">${profile.outlineLabel}</span>
        </label>
        ` : ''}
        ${profile.showTrailControls ? `
        <label class="cfg-field inline-check">
          <input id="cfgShowTrail" type="checkbox" ${config.showTrail ? 'checked' : ''} />
          <span class="cfg-field-label">${profile.trailLabel}</span>
        </label>
        ` : ''}
        ${profile.showPathControls ? `
        <label class="cfg-field inline-check">
          <input id="cfgShowPath" type="checkbox" ${config.showPath ? 'checked' : ''} />
          <span class="cfg-field-label">${profile.pathLabel}</span>
        </label>
        ` : ''}
        ${profile.showOrbitControls ? `
        <label class="cfg-field inline-check">
          <input id="cfgShowOrbit" type="checkbox" ${config.showOrbit ? 'checked' : ''} />
          <span class="cfg-field-label">${profile.orbitLabel}</span>
        </label>
        ` : ''}
      </div>
      <div class="cfg-slider-stack">
        ${profile.allowApply ? `
        <label class="cfg-slider-field">
          <span class="cfg-slider-header">
            <span class="cfg-field-label">${profile.maxEntitiesLabel}</span>
            <strong class="cfg-slider-value" id="cfgMaxEntitiesValue">${maxEntities.toLocaleString()} · ${maxEntitiesPct}%</strong>
          </span>
          <input id="cfgMaxEntities" type="range" min="${MAX_ENTITIES_MIN}" max="${MAX_ENTITIES_MAX}" step="1" value="${maxEntities}" />
        </label>
        ` : ''}
      </div>
      ${profile.allowApply ? `
      <div class="cfg-slider-stack compact-two">
        <label class="cfg-slider-field compact">
          <span class="cfg-slider-header">
            <span class="cfg-field-label">${profile.markerSizeLabel}</span>
            <strong class="cfg-slider-value" id="cfgMarkerSizeValue">${markerSizePct}% · ${markerSize}px</strong>
          </span>
          <input id="cfgMarkerSize" type="range" min="${MARKER_SIZE_MIN}" max="${MARKER_SIZE_MAX}" step="1" value="${markerSize}" />
        </label>
        <label class="cfg-slider-field compact">
          <span class="cfg-slider-header">
            <span class="cfg-field-label">${profile.markerOpacityLabel}</span>
            <strong class="cfg-slider-value" id="cfgMarkerOpacityValue">${markerOpacityPct}% · ${markerOpacity.toFixed(2)}</strong>
          </span>
          <input id="cfgMarkerOpacity" type="range" min="${MARKER_OPACITY_MIN}" max="${MARKER_OPACITY_MAX}" step="0.01" value="${markerOpacity}" />
        </label>
        ${profile.showOutlineControls ? `
        <label class="cfg-slider-field compact">
          <span class="cfg-slider-header">
            <span class="cfg-field-label">Outline Width</span>
            <strong class="cfg-slider-value" id="cfgOutlineWidthValue">${outlineWidthPct}% · ${outlineWidth.toFixed(1)}px</strong>
          </span>
          <input id="cfgOutlineWidth" type="range" min="${OUTLINE_WIDTH_MIN}" max="${OUTLINE_WIDTH_MAX}" step="0.1" value="${outlineWidth}" />
        </label>
        ` : ''}
        ${profile.showTrailControls ? `
        <label class="cfg-slider-field compact">
          <span class="cfg-slider-header">
            <span class="cfg-field-label">Trail Duration</span>
            <strong class="cfg-slider-value" id="cfgTrailMinutesValue">${trailMinutes.toFixed(0)} min</strong>
          </span>
          <input id="cfgTrailMinutes" type="range" min="${TRAIL_MINUTES_MIN}" max="${TRAIL_MINUTES_MAX}" step="1" value="${trailMinutes}" />
        </label>
        ` : ''}
        ${profile.showPathControls ? `
        <label class="cfg-slider-field compact">
          <span class="cfg-slider-header">
            <span class="cfg-field-label">Path Lead Duration</span>
            <strong class="cfg-slider-value" id="cfgPathLeadMinutesValue">${pathLeadMinutes.toFixed(0)} min</strong>
          </span>
          <input id="cfgPathLeadMinutes" type="range" min="${PATH_LEAD_MINUTES_MIN}" max="${PATH_LEAD_MINUTES_MAX}" step="1" value="${pathLeadMinutes}" />
        </label>
        ` : ''}
        ${profile.showOrbitControls ? `
        <label class="cfg-slider-field compact">
          <span class="cfg-slider-header">
            <span class="cfg-field-label">Orbit Duration</span>
            <strong class="cfg-slider-value" id="cfgOrbitMinutesValue">${orbitMinutes.toFixed(0)} min</strong>
          </span>
          <input id="cfgOrbitMinutes" type="range" min="${ORBIT_MINUTES_MIN}" max="${ORBIT_MINUTES_MAX}" step="1" value="${orbitMinutes}" />
        </label>
        ` : ''}
      </div>
      ` : ''}
      ${profile.showLabelControl ? `
      <label class="cfg-field inline-check">
        <input id="cfgShowLabel" type="checkbox" ${config.showLabel ? 'checked' : ''} />
        <span class="cfg-field-label">${profile.labelToggleText}</span>
      </label>
      ` : ''}
      ${profile.allowApply ? '' : `
      <div class="cfg-summary" aria-live="polite">
        <span>Config controls unavailable for this layer.</span>
        <span>Implement a dedicated renderer hook to enable live configuration.</span>
      </div>
      `}
      <div class="cfg-summary" aria-live="polite">
        <span>Layer updates apply immediately after save.</span>
        <span>Focused entity telemetry stays synchronized with this config.</span>
      </div>
    </div>
  `;
}

export function useLegacyLayerConfigPanel() {
  useEffect(() => {
    let selectedLayer = 'flights';

    const openConfig = (layer: string) => {
      const panelVisible = isLayerConfigPanelOpen();
      if (panelVisible && selectedLayer === layer) {
        setHidden('layerConfigPanel', true);
        return;
      }

      selectedLayer = layer;
      const profile = getLayerConfigProfile(layer);
      setText('configTitle', `${profile.title} CONFIG`);

      const dynamicNode = document.getElementById('cfgDynamic');
      if (dynamicNode) {
        dynamicNode.innerHTML = renderConfigHtml(layer);
        updateSliderReadouts();
      }

      setHidden('layerConfigPanel', false);
      const applyButton = document.getElementById('cfgApply') as HTMLButtonElement | null;
      if (applyButton) {
        applyButton.disabled = !profile.allowApply;
        applyButton.setAttribute('aria-disabled', profile.allowApply ? 'false' : 'true');
        applyButton.textContent = profile.allowApply ? 'Apply' : 'No Config';
      }
    };

    const applyConfig = () => {
      const profile = getLayerConfigProfile(selectedLayer);
      if (!profile.allowApply) {
        setHidden('layerConfigPanel', true);
        return;
      }
      const current = getLayerVisualConfig(selectedLayer);
      const color = (document.getElementById('cfgColor') as HTMLInputElement | null)?.value;
      const iconPreset = (document.getElementById('cfgIconPreset') as HTMLSelectElement | null)?.value;
      const maxEntitiesRaw = Number((document.getElementById('cfgMaxEntities') as HTMLInputElement | null)?.value ?? 500);
      const markerSizeRaw = Number((document.getElementById('cfgMarkerSize') as HTMLInputElement | null)?.value ?? 7);
      const markerOpacityRaw = Number((document.getElementById('cfgMarkerOpacity') as HTMLInputElement | null)?.value ?? 0.94);
      const outlineEnabled = (document.getElementById('cfgOutlineEnabled') as HTMLInputElement | null)?.checked ?? current.outlineEnabled;
      const outlineColor = (document.getElementById('cfgOutlineColor') as HTMLInputElement | null)?.value;
      const outlineWidthRaw = Number((document.getElementById('cfgOutlineWidth') as HTMLInputElement | null)?.value ?? current.outlineWidth);
      const showTrail = (document.getElementById('cfgShowTrail') as HTMLInputElement | null)?.checked ?? current.showTrail;
      const showPath = (document.getElementById('cfgShowPath') as HTMLInputElement | null)?.checked ?? current.showPath;
      const showOrbit = (document.getElementById('cfgShowOrbit') as HTMLInputElement | null)?.checked ?? current.showOrbit;
      const advancedSatellites = (document.getElementById('cfgSatelliteAdvanced') as HTMLInputElement | null)?.checked ?? current.advancedSatellites;
      const trailMinutesRaw = Number((document.getElementById('cfgTrailMinutes') as HTMLInputElement | null)?.value ?? current.trailMinutes);
      const pathLeadMinutesRaw = Number((document.getElementById('cfgPathLeadMinutes') as HTMLInputElement | null)?.value ?? current.pathLeadMinutes);
      const orbitMinutesRaw = Number((document.getElementById('cfgOrbitMinutes') as HTMLInputElement | null)?.value ?? current.orbitMinutes);
      const showLabel = (document.getElementById('cfgShowLabel') as HTMLInputElement | null)?.checked ?? current.showLabel;

      const maxEntities = clamp(maxEntitiesRaw, MAX_ENTITIES_MIN, MAX_ENTITIES_MAX);
      const markerSize = clamp(markerSizeRaw, MARKER_SIZE_MIN, MARKER_SIZE_MAX);
      const markerOpacity = clamp(markerOpacityRaw, MARKER_OPACITY_MIN, MARKER_OPACITY_MAX);
      const outlineWidth = clamp(outlineWidthRaw, OUTLINE_WIDTH_MIN, OUTLINE_WIDTH_MAX);
      const trailMinutes = clamp(trailMinutesRaw, TRAIL_MINUTES_MIN, TRAIL_MINUTES_MAX);
      const pathLeadMinutes = clamp(pathLeadMinutesRaw, PATH_LEAD_MINUTES_MIN, PATH_LEAD_MINUTES_MAX);
      const orbitMinutes = clamp(orbitMinutesRaw, ORBIT_MINUTES_MIN, ORBIT_MINUTES_MAX);

      const saved = setLayerVisualConfig(selectedLayer, {
        color,
        iconPreset: (profile.showIconPreset && profile.iconOptions.includes((iconPreset as LayerIconPreset) ?? 'dot')
          ? iconPreset
          : current.iconPreset) as LayerIconPreset,
        maxEntities,
        markerSize,
        markerOpacity,
        outlineEnabled: profile.showOutlineControls ? outlineEnabled : current.outlineEnabled,
        outlineColor: profile.showOutlineControls ? outlineColor : current.outlineColor,
        outlineWidth: profile.showOutlineControls ? outlineWidth : current.outlineWidth,
        showTrail: profile.showTrailControls ? showTrail : false,
        showPath: profile.showPathControls ? showPath : false,
        showOrbit: profile.showOrbitControls ? showOrbit : false,
        advancedSatellites: profile.showAdvancedSatellites ? advancedSatellites : false,
        trailMinutes,
        pathLeadMinutes,
        orbitMinutes,
        showLabel: profile.showLabelControl ? showLabel : false,
      });

      setText('layerHealth', `LINK: ${selectedLayer} CFG updated · ${saved.iconPreset.toUpperCase()} · ${saved.maxEntities}`);
      setHidden('layerConfigPanel', true);
    };

    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest('button');
      if (!button) {
        return;
      }

      if (button.hasAttribute('data-config')) {
        openConfig(button.getAttribute('data-config') ?? 'flights');
        return;
      }

      if (button.id === 'cfgApply') {
        applyConfig();
        return;
      }

      if (button.id === 'cfgClose') {
        setHidden('layerConfigPanel', true);
      }
    };

    const onInput = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      if (target.id === 'cfgMaxEntities'
        || target.id === 'cfgMarkerSize'
        || target.id === 'cfgMarkerOpacity'
        || target.id === 'cfgOutlineWidth'
        || target.id === 'cfgTrailMinutes'
        || target.id === 'cfgPathLeadMinutes'
        || target.id === 'cfgOrbitMinutes') {
        updateSliderReadouts();
      }
    };

    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('input', onInput);
    };
  }, []);
}
