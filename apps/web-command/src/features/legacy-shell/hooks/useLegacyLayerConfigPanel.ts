import { useEffect } from 'react';

import { getLayerVisualConfig, setLayerVisualConfig } from '../../layer-config/layerVisualConfig';
import { setHidden, setText } from '../utils/domUi';

const MAX_ENTITIES_MIN = 1;
const MAX_ENTITIES_MAX = 5000;
const MARKER_SIZE_MIN = 2;
const MARKER_SIZE_MAX = 24;
const MARKER_OPACITY_MIN = 0.1;
const MARKER_OPACITY_MAX = 1;
const OUTLINE_WIDTH_MIN = 0;
const OUTLINE_WIDTH_MAX = 6;

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
  const maxEntitiesValue = document.getElementById('cfgMaxEntitiesValue');
  const markerSizeValue = document.getElementById('cfgMarkerSizeValue');
  const markerOpacityValue = document.getElementById('cfgMarkerOpacityValue');
  const outlineWidthValue = document.getElementById('cfgOutlineWidthValue');

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
}

function renderConfigHtml(layer: string) {
  const config = getLayerVisualConfig(layer);
  const maxEntities = clamp(config.maxEntities, MAX_ENTITIES_MIN, MAX_ENTITIES_MAX);
  const markerSize = clamp(config.markerSize, MARKER_SIZE_MIN, MARKER_SIZE_MAX);
  const markerOpacity = clamp(config.markerOpacity, MARKER_OPACITY_MIN, MARKER_OPACITY_MAX);
  const outlineWidth = clamp(config.outlineWidth, OUTLINE_WIDTH_MIN, OUTLINE_WIDTH_MAX);
  const maxEntitiesPct = sliderPercent(maxEntities, MAX_ENTITIES_MIN, MAX_ENTITIES_MAX);
  const markerSizePct = sliderPercent(markerSize, MARKER_SIZE_MIN, MARKER_SIZE_MAX);
  const markerOpacityPct = sliderPercent(markerOpacity, MARKER_OPACITY_MIN, MARKER_OPACITY_MAX);
  const outlineWidthPct = sliderPercent(outlineWidth, OUTLINE_WIDTH_MIN, OUTLINE_WIDTH_MAX);

  return `
    <div class="cfg-shell">
      <p class="cfg-note">Configure rendering density, icon style, outline, and marker visibility for this layer in real time.</p>
      <div class="cfg-grid">
        <label class="cfg-field">
          <span class="cfg-field-label">Color</span>
          <input id="cfgColor" type="color" value="${config.color}" />
        </label>
        <label class="cfg-field">
          <span class="cfg-field-label">Icon Preset</span>
          <select id="cfgIconPreset">
            <option value="dot" ${config.iconPreset === 'dot' ? 'selected' : ''}>Dot</option>
            <option value="plane" ${config.iconPreset === 'plane' ? 'selected' : ''}>Plane</option>
            <option value="satellite" ${config.iconPreset === 'satellite' ? 'selected' : ''}>Satellite</option>
          </select>
        </label>
        <label class="cfg-field">
          <span class="cfg-field-label">Outline Color</span>
          <input id="cfgOutlineColor" type="color" value="${config.outlineColor}" />
        </label>
        <label class="cfg-field inline-check">
          <input id="cfgOutlineEnabled" type="checkbox" ${config.outlineEnabled ? 'checked' : ''} />
          <span class="cfg-field-label">Outline Enabled</span>
        </label>
      </div>
      <div class="cfg-slider-stack">
        <label class="cfg-slider-field">
          <span class="cfg-slider-header">
            <span class="cfg-field-label">Max Entities</span>
            <strong class="cfg-slider-value" id="cfgMaxEntitiesValue">${maxEntities.toLocaleString()} · ${maxEntitiesPct}%</strong>
          </span>
          <input id="cfgMaxEntities" type="range" min="${MAX_ENTITIES_MIN}" max="${MAX_ENTITIES_MAX}" step="1" value="${maxEntities}" />
        </label>
        <label class="cfg-slider-field">
          <span class="cfg-slider-header">
            <span class="cfg-field-label">Marker Size</span>
            <strong class="cfg-slider-value" id="cfgMarkerSizeValue">${markerSizePct}% · ${markerSize}px</strong>
          </span>
          <input id="cfgMarkerSize" type="range" min="${MARKER_SIZE_MIN}" max="${MARKER_SIZE_MAX}" step="1" value="${markerSize}" />
        </label>
        <label class="cfg-slider-field">
          <span class="cfg-slider-header">
            <span class="cfg-field-label">Marker Opacity</span>
            <strong class="cfg-slider-value" id="cfgMarkerOpacityValue">${markerOpacityPct}% · ${markerOpacity.toFixed(2)}</strong>
          </span>
          <input id="cfgMarkerOpacity" type="range" min="${MARKER_OPACITY_MIN}" max="${MARKER_OPACITY_MAX}" step="0.01" value="${markerOpacity}" />
        </label>
        <label class="cfg-slider-field">
          <span class="cfg-slider-header">
            <span class="cfg-field-label">Outline Width</span>
            <strong class="cfg-slider-value" id="cfgOutlineWidthValue">${outlineWidthPct}% · ${outlineWidth.toFixed(1)}px</strong>
          </span>
          <input id="cfgOutlineWidth" type="range" min="${OUTLINE_WIDTH_MIN}" max="${OUTLINE_WIDTH_MAX}" step="0.1" value="${outlineWidth}" />
        </label>
      </div>
      <label class="cfg-field inline-check">
        <input id="cfgShowLabel" type="checkbox" ${config.showLabel ? 'checked' : ''} />
        <span class="cfg-field-label">Show Label</span>
      </label>
      <div class="cfg-summary" aria-live="polite">
        <span>Layer updates apply immediately after save.</span>
        <span>Focus cards stay synchronized with this config.</span>
      </div>
    </div>
  `;
}

export function useLegacyLayerConfigPanel() {
  useEffect(() => {
    let selectedLayer = 'flights';

    const openConfig = (layer: string) => {
      selectedLayer = layer;
      setText('configTitle', `${layer.toUpperCase()} CONFIG`);

      const dynamicNode = document.getElementById('cfgDynamic');
      if (dynamicNode) {
        dynamicNode.innerHTML = renderConfigHtml(layer);
        updateSliderReadouts();
      }

      setHidden('layerConfigPanel', false);
    };

    const applyConfig = () => {
      const color = (document.getElementById('cfgColor') as HTMLInputElement | null)?.value;
      const iconPreset = (document.getElementById('cfgIconPreset') as HTMLSelectElement | null)?.value;
      const maxEntitiesRaw = Number((document.getElementById('cfgMaxEntities') as HTMLInputElement | null)?.value ?? 500);
      const markerSizeRaw = Number((document.getElementById('cfgMarkerSize') as HTMLInputElement | null)?.value ?? 7);
      const markerOpacityRaw = Number((document.getElementById('cfgMarkerOpacity') as HTMLInputElement | null)?.value ?? 0.94);
      const outlineEnabled = (document.getElementById('cfgOutlineEnabled') as HTMLInputElement | null)?.checked ?? true;
      const outlineColor = (document.getElementById('cfgOutlineColor') as HTMLInputElement | null)?.value;
      const outlineWidthRaw = Number((document.getElementById('cfgOutlineWidth') as HTMLInputElement | null)?.value ?? 1);
      const showLabel = (document.getElementById('cfgShowLabel') as HTMLInputElement | null)?.checked ?? true;
      const maxEntities = clamp(maxEntitiesRaw, MAX_ENTITIES_MIN, MAX_ENTITIES_MAX);
      const markerSize = clamp(markerSizeRaw, MARKER_SIZE_MIN, MARKER_SIZE_MAX);
      const markerOpacity = clamp(markerOpacityRaw, MARKER_OPACITY_MIN, MARKER_OPACITY_MAX);
      const outlineWidth = clamp(outlineWidthRaw, OUTLINE_WIDTH_MIN, OUTLINE_WIDTH_MAX);

      const saved = setLayerVisualConfig(selectedLayer, {
        color,
        iconPreset: iconPreset as 'dot' | 'plane' | 'satellite',
        maxEntities,
        markerSize,
        markerOpacity,
        outlineEnabled,
        outlineColor,
        outlineWidth,
        showLabel,
      });

      setText('layerHealth', `LINK: ${selectedLayer} CFG updated · ${saved.iconPreset.toUpperCase()} · ${saved.maxEntities} · OL ${saved.outlineEnabled ? 'ON' : 'OFF'}`);
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
        || target.id === 'cfgOutlineWidth') {
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
