/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_CESIUM_ION_ACCESS_TOKEN?: string;
  readonly VITE_TILE_PROVIDER?: 'google' | 'cesium-ion';
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  CESIUM_BASE_URL?: string;
  __recenterEarth?: () => void;
  __applyPerformancePreset?: (preset: string) => void;
  __setCameraFocusMode?: (mode: 'mouse' | 'crosshair') => void;
  __getCameraFocusMode?: () => 'mouse' | 'crosshair';
}
