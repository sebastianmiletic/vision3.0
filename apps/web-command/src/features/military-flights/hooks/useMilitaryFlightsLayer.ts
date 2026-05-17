import { useEffect } from 'react';

import { fetchMilitaryFlights } from '../../../services/integrations/militaryFlightsService';
import { ensureMilitaryFlightDataSource, renderMilitaryFlights } from '../services/militaryFlightLayerPresenter';
import { setMilitaryFlightUiStatus } from '../services/militaryFlightUiTelemetry';

import type { MutableRefObject } from 'react';
import type { Viewer } from 'cesium';

const POLL_INTERVAL_MS = 12000;
const BOOTSTRAP_INTERVAL_MS = 1400;

function isLayerEnabled() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-toggle="military"]');
  if (!toggle) {
    return true;
  }
  return toggle.classList.contains('on');
}

export function useMilitaryFlightsLayer(viewerRef: MutableRefObject<Viewer | null>) {
  useEffect(() => {
    let alive = true;
    let refreshInFlight = false;
    let hasRenderedOnce = false;

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
        if (!isLayerEnabled()) {
          const dataSource = await ensureMilitaryFlightDataSource(viewer);
          dataSource.entities.removeAll();
          setMilitaryFlightUiStatus('ADSB.lol military · disabled', 0);
          refreshInFlight = false;
          return;
        }

        const flights = await fetchMilitaryFlights();
        if (!alive) {
          refreshInFlight = false;
          return;
        }

        await renderMilitaryFlights(viewer, flights);
        hasRenderedOnce = true;
      } catch (error) {
        setMilitaryFlightUiStatus('ADSB.lol military · waiting...', 0);
        console.error('Failed to load military flights layer', error);
      } finally {
        refreshInFlight = false;
      }
    }

    void refresh();
    const bootstrapIntervalId = window.setInterval(() => {
      if (!alive || hasRenderedOnce) {
        return;
      }
      void refresh();
    }, BOOTSTRAP_INTERVAL_MS);
    const intervalId = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    const configChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ layer: string }>).detail;
      if (!detail || detail.layer !== 'military') {
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
      window.clearInterval(bootstrapIntervalId);
      window.clearInterval(intervalId);
      window.removeEventListener('vision:layer-config-changed', configChanged);
      window.removeEventListener('vision:layer-toggle-changed', layerToggleChanged);
      window.removeEventListener('vision:layer-group-toggled', layerToggleChanged);
    };
  }, [viewerRef]);
}
