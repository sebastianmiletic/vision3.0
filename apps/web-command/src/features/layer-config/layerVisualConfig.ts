export type LayerIconPreset = 'dot' | 'plane' | 'satellite';

export type LayerVisualConfig = {
  color: string;
  iconPreset: LayerIconPreset;
  maxEntities: number;
  markerSize: number;
  markerOpacity: number;
  outlineEnabled: boolean;
  outlineColor: string;
  outlineWidth: number;
  showLabel: boolean;
};

const DEFAULT_CONFIG: LayerVisualConfig = {
  color: '#26c9ff',
  iconPreset: 'dot',
  maxEntities: 220,
  markerSize: 6,
  markerOpacity: 0.94,
  outlineEnabled: true,
  outlineColor: '#000000',
  outlineWidth: 1,
  showLabel: false,
};

const layerConfigStore = new Map<string, LayerVisualConfig>();

function normalizeColor(color: string | undefined): string {
  if (!color) {
    return DEFAULT_CONFIG.color;
  }

  const value = color.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    return DEFAULT_CONFIG.color;
  }

  return value;
}

function normalizeOutlineColor(color: string | undefined): string {
  if (!color) {
    return DEFAULT_CONFIG.outlineColor;
  }

  const value = color.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    return DEFAULT_CONFIG.outlineColor;
  }

  return value;
}

function normalizeIcon(iconPreset: string | undefined): LayerIconPreset {
  if (iconPreset === 'plane' || iconPreset === 'satellite' || iconPreset === 'dot') {
    return iconPreset;
  }

  return DEFAULT_CONFIG.iconPreset;
}

function normalizeConfig(partial: Partial<LayerVisualConfig>): LayerVisualConfig {
  return {
    color: normalizeColor(partial.color),
    iconPreset: normalizeIcon(partial.iconPreset),
    maxEntities: Math.min(5000, Math.max(1, Number(partial.maxEntities ?? DEFAULT_CONFIG.maxEntities))),
    markerSize: Math.min(24, Math.max(2, Number(partial.markerSize ?? DEFAULT_CONFIG.markerSize))),
    markerOpacity: Math.min(1, Math.max(0.1, Number(partial.markerOpacity ?? DEFAULT_CONFIG.markerOpacity))),
    outlineEnabled: partial.outlineEnabled ?? DEFAULT_CONFIG.outlineEnabled,
    outlineColor: normalizeOutlineColor(partial.outlineColor),
    outlineWidth: Math.min(6, Math.max(0, Number(partial.outlineWidth ?? DEFAULT_CONFIG.outlineWidth))),
    showLabel: partial.showLabel ?? DEFAULT_CONFIG.showLabel,
  };
}

export function getLayerVisualConfig(layer: string): LayerVisualConfig {
  const current = layerConfigStore.get(layer);
  if (current) {
    return current;
  }

  const layerLower = layer.toLowerCase();
  const seeded = normalizeConfig({
    iconPreset: layerLower.includes('sat') ? 'satellite' : layerLower.includes('flight') || layerLower.includes('military') ? 'plane' : 'dot',
    maxEntities: layerLower.includes('sat') ? 180 : layerLower.includes('flight') ? 500 : DEFAULT_CONFIG.maxEntities,
    markerSize: layerLower.includes('sat') ? 7 : DEFAULT_CONFIG.markerSize,
    showLabel: false,
  });

  layerConfigStore.set(layer, seeded);
  return seeded;
}

export function setLayerVisualConfig(layer: string, config: Partial<LayerVisualConfig>): LayerVisualConfig {
  const merged = normalizeConfig({ ...getLayerVisualConfig(layer), ...config });
  layerConfigStore.set(layer, merged);
  window.dispatchEvent(
    new CustomEvent('vision:layer-config-changed', {
      detail: {
        layer,
        config: merged,
      },
    }),
  );

  return merged;
}

export function getLayerVisualConfigSnapshot() {
  const snapshot: Record<string, LayerVisualConfig> = {};
  for (const [layer, config] of layerConfigStore.entries()) {
    snapshot[layer] = config;
  }

  return snapshot;
}
