import { useEffect } from 'react';

import { applyBordersLabelsLayer } from '../services/bordersLabelsLayerPresenter';
import { setBordersLabelsUiStatus } from '../services/bordersLabelsUiTelemetry';

import type { MutableRefObject } from 'react';
import type { Viewer } from 'cesium';

function isBordersLabelsLayerEnabled() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-toggle="bordersLabels"]');
  if (!toggle) {
    return true;
  }

  return toggle.classList.contains('on');
}

export function useBordersLabelsLayer(viewerRef: MutableRefObject<Viewer | null>) {
  useEffect(() => {
    let alive = true;
    let refreshInFlight = false;

    async function refresh() {
      if (!alive || refreshInFlight) {
        return;
      }

      refreshInFlight = true;
      const viewer = viewerRef.current;
      if (!viewer) {
        refreshInFlight = false;
        return;
      }

      try {
        await applyBordersLabelsLayer(viewer, isBordersLabelsLayerEnabled());
      } catch (error) {
        setBordersLabelsUiStatus('Natural Earth borders · waiting...', 0);
        console.error('Failed to load borders + labels layer', error);
      } finally {
        refreshInFlight = false;
      }
    }

    void refresh();

    const configChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ layer: string }>).detail;
      if (!detail || detail.layer !== 'bordersLabels') {
        return;
      }

      void refresh();
    };

    const layerToggleChanged = () => {
      void refresh();
    };

    window.addEventListener('vision:layer-config-changed', configChanged);
    window.addEventListener('vision:layer-toggle-changed', layerToggleChanged);
    window.addEventListener('vision:layer-group-toggled', layerToggleChanged);

    return () => {
      alive = false;
      window.removeEventListener('vision:layer-config-changed', configChanged);
      window.removeEventListener('vision:layer-toggle-changed', layerToggleChanged);
      window.removeEventListener('vision:layer-group-toggled', layerToggleChanged);
    };
  }, [viewerRef]);
}
