import { create } from 'zustand';

import type { LayerToggleState, ThemeConfig } from '@vision/shared-types';

type AppStore = {
  theme: ThemeConfig;
  layers: LayerToggleState;
  setTheme: (partial: Partial<ThemeConfig>) => void;
  toggleLayer: (layer: string) => void;
};

const defaultLayerState: LayerToggleState = {
  'orbital-corridors': true,
  pipelines: false,
  'trade-routes': false,
  'undersea-cables': false,
};

export const useAppStore = create<AppStore>((set) => ({
  theme: {
    accent: 'teal',
    panelOpacity: 0.84,
    mode: 'spotlight',
  },
  layers: defaultLayerState,
  setTheme: (partial) =>
    set((state) => ({
      theme: {
        ...state.theme,
        ...partial,
      },
    })),
  toggleLayer: (layer) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [layer]: !state.layers[layer],
      },
    })),
}));
