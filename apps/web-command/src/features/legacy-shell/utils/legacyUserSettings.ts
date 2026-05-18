export type LegacyShellSettings = {
  version: 1;
  layerToggles?: Record<string, boolean>;
  styleModes?: string[];
  performancePreset?: string;
  cameraFocusMode?: 'mouse' | 'crosshair';
  worldTexturePreset?: string;
  accentColor?: string;
  customShaderEnabled?: boolean;
  mapFullscreen?: boolean;
  cleanUi?: boolean;
  mapMode2d?: boolean;
  effectSliders?: Record<string, string>;
};

const STORAGE_KEY = 'vision.v3.legacy-shell.settings.v1';

const EMPTY_SETTINGS: LegacyShellSettings = { version: 1 };

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeSettings(raw: unknown): LegacyShellSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_SETTINGS };
  }

  const candidate = raw as Partial<LegacyShellSettings>;
  const normalized: LegacyShellSettings = { version: 1 };

  if (candidate.layerToggles && typeof candidate.layerToggles === 'object') {
    const toggles: Record<string, boolean> = {};
    Object.entries(candidate.layerToggles).forEach(([key, value]) => {
      toggles[key] = Boolean(value);
    });
    normalized.layerToggles = toggles;
  }

  if (Array.isArray(candidate.styleModes)) {
    const styles = candidate.styleModes
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);
    if (styles.length > 0) {
      normalized.styleModes = Array.from(new Set(styles));
    }
  }

  if (typeof candidate.performancePreset === 'string') {
    normalized.performancePreset = candidate.performancePreset;
  }

  if (candidate.cameraFocusMode === 'mouse' || candidate.cameraFocusMode === 'crosshair') {
    normalized.cameraFocusMode = candidate.cameraFocusMode;
  }

  if (typeof candidate.worldTexturePreset === 'string') {
    normalized.worldTexturePreset = candidate.worldTexturePreset;
  }

  if (typeof candidate.accentColor === 'string') {
    normalized.accentColor = candidate.accentColor;
  }

  if (typeof candidate.customShaderEnabled === 'boolean') {
    normalized.customShaderEnabled = candidate.customShaderEnabled;
  }

  if (typeof candidate.mapFullscreen === 'boolean') {
    normalized.mapFullscreen = candidate.mapFullscreen;
  }

  if (typeof candidate.cleanUi === 'boolean') {
    normalized.cleanUi = candidate.cleanUi;
  }

  if (typeof candidate.mapMode2d === 'boolean') {
    normalized.mapMode2d = candidate.mapMode2d;
  }

  if (candidate.effectSliders && typeof candidate.effectSliders === 'object') {
    const sliders: Record<string, string> = {};
    Object.entries(candidate.effectSliders).forEach(([key, value]) => {
      if (typeof value === 'string') {
        sliders[key] = value;
      }
    });
    if (Object.keys(sliders).length > 0) {
      normalized.effectSliders = sliders;
    }
  }

  return normalized;
}

export function loadLegacyShellSettings(): LegacyShellSettings {
  if (!canUseStorage()) {
    return { ...EMPTY_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...EMPTY_SETTINGS };
    }
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...EMPTY_SETTINGS };
  }
}

export function saveLegacyShellSettings(patch: Partial<LegacyShellSettings>) {
  if (!canUseStorage()) {
    return;
  }

  const merged = normalizeSettings({
    ...loadLegacyShellSettings(),
    ...patch,
    version: 1,
  });

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Best effort only.
  }
}

export function saveLegacyShellLayerToggle(layer: string, enabled: boolean) {
  const current = loadLegacyShellSettings();
  saveLegacyShellSettings({
    layerToggles: {
      ...(current.layerToggles ?? {}),
      [layer]: enabled,
    },
  });
}

export function clearLegacyShellSettings() {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best effort only.
  }
}
