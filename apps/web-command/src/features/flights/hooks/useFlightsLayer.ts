import { useEffect } from 'react';

import { fetchFlights } from '../../../services/integrations/flightsService';
import { renderFlights } from '../services/flightLayerPresenter';
import { setFlightUiStatus } from '../services/flightUiTelemetry';

import type { MutableRefObject } from 'react';
import type { Viewer } from 'cesium';

const POLL_INTERVAL_MS = 12000;

export function useFlightsLayer(viewerRef: MutableRefObject<Viewer | null>) {
  useEffect(() => {
    let alive = true;

    async function refresh() {
      const viewer = viewerRef.current;
      if (!viewer) {
        return;
      }

      try {
        const flights = await fetchFlights();
        if (!alive) {
          return;
        }

        await renderFlights(viewer, flights);
      } catch (error) {
        setFlightUiStatus('OpenSky network · waiting...', 0);
        console.error('Failed to load flights layer', error);
      }
    }

    void refresh();
    const intervalId = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
    };
  }, [viewerRef]);
}
