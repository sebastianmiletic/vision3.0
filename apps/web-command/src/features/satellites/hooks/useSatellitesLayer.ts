import { useEffect } from 'react';

import { fetchSatellites } from '../../../services/integrations/satellitesService';
import { ensureSatelliteDataSource, renderSatellites } from '../services/satelliteLayerPresenter';
import { setSatelliteUiStatus } from '../services/satelliteUiTelemetry';

import type { MutableRefObject } from 'react';
import type { Viewer } from 'cesium';

const POLL_INTERVAL_MS = 20000;

function isSatelliteLayerEnabled() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-toggle="satellites"]');
  if (!toggle) {
    return true;
  }

  return toggle.classList.contains('on');
}

export function useSatellitesLayer(viewerRef: MutableRefObject<Viewer | null>) {
  useEffect(() => {
    let alive = true;
    let refreshInFlight = false;

    async function refresh() {
      if (refreshInFlight) {
        return;
      }

      refreshInFlight = true;
      const viewer = viewerRef.current;
      if (!viewer) {
        refreshInFlight = false;
        return;
      }

      try {
        if (!isSatelliteLayerEnabled()) {
          const dataSource = await ensureSatelliteDataSource(viewer);
          dataSource.entities.removeAll();
          setSatelliteUiStatus('CelesTrak · disabled', 0);
          refreshInFlight = false;
          return;
        }

        const satellites = await fetchSatellites();
        if (!alive) {
          refreshInFlight = false;
          return;
        }

        await renderSatellites(viewer, satellites);
      } catch (error) {
        setSatelliteUiStatus('CelesTrak · waiting...', 0);
        console.error('Failed to load satellites layer', error);
      } finally {
        refreshInFlight = false;
      }
    }

    void refresh();
    const intervalId = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);

    const configChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ layer: string }>).detail;
      if (!detail || detail.layer !== 'satellites') {
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
      window.clearInterval(intervalId);
      window.removeEventListener('vision:layer-config-changed', configChanged);
      window.removeEventListener('vision:layer-toggle-changed', layerToggleChanged);
      window.removeEventListener('vision:layer-group-toggled', layerToggleChanged);
    };
  }, [viewerRef]);
}
