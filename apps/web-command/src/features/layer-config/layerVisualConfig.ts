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
  showTrail: boolean;
  trailMinutes: number;
  showPath: boolean;
  pathLeadMinutes: number;
  showOrbit: boolean;
  orbitMinutes: number;
  advancedSatellites: boolean;
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
  showTrail: false,
  trailMinutes: 20,
  showPath: false,
  pathLeadMinutes: 12,
  showOrbit: false,
  orbitMinutes: 45,
  advancedSatellites: false,
  showLabel: false,
};

const layerConfigStore = new Map<string, LayerVisualConfig>();

const LAYER_CONFIG_STORAGE_KEY = 'vision.v3.layer-visual-config.v1';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function persistLayerConfigStore() {
  if (!canUseStorage()) {
    return;
  }

  try {
    const snapshot: Record<string, LayerVisualConfig> = {};
    for (const [layer, config] of layerConfigStore.entries()) {
      snapshot[layer] = config;
    }
    window.localStorage.setItem(LAYER_CONFIG_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Best effort only.
  }
}

function restoreLayerConfigStore() {
  if (!canUseStorage()) {
    return;
  }

  try {
    const raw = window.localStorage.getItem(LAYER_CONFIG_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Record<string, Partial<LayerVisualConfig>>;
    if (!parsed || typeof parsed !== 'object') {
      return;
    }

    Object.entries(parsed).forEach(([layer, partial]) => {
      if (!partial || typeof partial !== 'object') {
        return;
      }
      const seeded = normalizeConfig({ ...seededConfigForLayer(layer.toLowerCase()), ...partial });
      layerConfigStore.set(layer, seeded);
    });
  } catch {
    // Ignore corrupted saved config.
  }
}

restoreLayerConfigStore();

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
    showTrail: partial.showTrail ?? DEFAULT_CONFIG.showTrail,
    trailMinutes: Math.min(240, Math.max(1, Number(partial.trailMinutes ?? DEFAULT_CONFIG.trailMinutes))),
    showPath: partial.showPath ?? DEFAULT_CONFIG.showPath,
    pathLeadMinutes: Math.min(240, Math.max(1, Number(partial.pathLeadMinutes ?? DEFAULT_CONFIG.pathLeadMinutes))),
    showOrbit: partial.showOrbit ?? DEFAULT_CONFIG.showOrbit,
    orbitMinutes: Math.min(240, Math.max(1, Number(partial.orbitMinutes ?? DEFAULT_CONFIG.orbitMinutes))),
    advancedSatellites: partial.advancedSatellites ?? DEFAULT_CONFIG.advancedSatellites,
    showLabel: partial.showLabel ?? DEFAULT_CONFIG.showLabel,
  };
}

function seededConfigForLayer(layer: string): Partial<LayerVisualConfig> {
  switch (layer) {
    case 'flights':
      return {
        iconPreset: 'plane',
        maxEntities: 520,
        markerSize: 7,
        markerOpacity: 0.96,
        outlineEnabled: true,
        outlineColor: '#08101a',
        outlineWidth: 1.6,
        showTrail: true,
        trailMinutes: 25,
        showPath: true,
        pathLeadMinutes: 16,
        showOrbit: false,
        orbitMinutes: 45,
        advancedSatellites: false,
        showLabel: true,
      };
    case 'military':
      return {
        iconPreset: 'plane',
        maxEntities: 320,
        markerSize: 7,
        markerOpacity: 0.95,
        outlineEnabled: true,
        outlineColor: '#0a111f',
        outlineWidth: 1.8,
        showTrail: true,
        trailMinutes: 30,
        showPath: true,
        pathLeadMinutes: 20,
        showOrbit: false,
        orbitMinutes: 45,
        advancedSatellites: false,
        showLabel: true,
      };
    case 'satellites':
      return {
        iconPreset: 'satellite',
        maxEntities: 180,
        markerSize: 7,
        markerOpacity: 0.94,
        outlineEnabled: true,
        outlineColor: '#000000',
        outlineWidth: 1,
        showTrail: false,
        trailMinutes: 30,
        showPath: false,
        pathLeadMinutes: 35,
        showOrbit: true,
        orbitMinutes: 45,
        advancedSatellites: false,
        showLabel: true,
      };
    case 'borderslabels':
      return {
        iconPreset: 'dot',
        maxEntities: 420,
        markerSize: 6,
        markerOpacity: 0.96,
        outlineEnabled: true,
        outlineColor: '#08101a',
        outlineWidth: 2.6,
        showTrail: false,
        trailMinutes: 20,
        showPath: false,
        pathLeadMinutes: 12,
        showOrbit: false,
        orbitMinutes: 45,
        advancedSatellites: false,
        showLabel: true,
      };
    default:
      return {
        iconPreset: layer.includes('sat') ? 'satellite' : layer.includes('flight') || layer.includes('military') ? 'plane' : 'dot',
        maxEntities: 220,
        markerSize: 6,
        markerOpacity: 0.94,
        outlineEnabled: false,
        outlineColor: '#000000',
        outlineWidth: 0,
        showTrail: false,
        trailMinutes: 20,
        showPath: false,
        pathLeadMinutes: 12,
        showOrbit: false,
        orbitMinutes: 45,
        advancedSatellites: false,
        showLabel: false,
      };
  }
}

export function getLayerVisualConfig(layer: string): LayerVisualConfig {
  const current = layerConfigStore.get(layer);
  if (current) {
    return current;
  }

  const layerLower = layer.toLowerCase();
  const seeded = normalizeConfig(seededConfigForLayer(layerLower));

  layerConfigStore.set(layer, seeded);
  return seeded;
}

export function setLayerVisualConfig(layer: string, config: Partial<LayerVisualConfig>): LayerVisualConfig {
  const merged = normalizeConfig({ ...getLayerVisualConfig(layer), ...config });
  layerConfigStore.set(layer, merged);
  persistLayerConfigStore();
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


export function resetLayerVisualConfigStorage() {
  layerConfigStore.clear();
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(LAYER_CONFIG_STORAGE_KEY);
  } catch {
    // Best effort only.
  }
}
