import { describe, expect, it } from 'vitest';

import { useAppStore } from './appStore';

describe('appStore', () => {
  it('toggles layer values', () => {
    useAppStore.setState({
      ...useAppStore.getState(),
      layers: {
        'orbital-corridors': true,
        pipelines: false,
        'trade-routes': false,
        'undersea-cables': false,
      },
    });

    useAppStore.getState().toggleLayer('pipelines');

    expect(useAppStore.getState().layers.pipelines).toBe(true);
  });

  it('updates accent theme', () => {
    useAppStore.getState().setTheme({ accent: 'rose' });

    expect(useAppStore.getState().theme.accent).toBe('rose');
  });
});
