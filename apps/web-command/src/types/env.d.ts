/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_CESIUM_ION_ACCESS_TOKEN?: string;
  readonly VITE_TILE_PROVIDER?: 'google' | 'cesium-ion' | 'imagery-only';
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  CESIUM_BASE_URL?: string;
  __visionStartupReady?: boolean;
  __visionGlobeReady?: boolean;
  __recenterEarth?: () => void;
  __applyPerformancePreset?: (preset: string) => void;
  __applyWorldTexturePreset?: (preset: string) => void;
  __prepareTilesForLocation?: (latitude: number, longitude: number) => Promise<void>;
  __flyToOptimalLocationView?: (latitude: number, longitude: number, label?: string) => {
    headingDegrees: number;
    pitchDegrees: number;
    rangeMeters: number;
    targetLabel: string;
  } | null;
  __cycleCardinalView?: () => {
    direction: 'north' | 'east' | 'south' | 'west';
    nextDirection: 'north' | 'east' | 'south' | 'west';
    targetLabel: string;
  } | null;
  __setCameraFocusMode?: (mode: 'mouse' | 'crosshair') => void;
  __getCameraFocusMode?: () => 'mouse' | 'crosshair';
}
