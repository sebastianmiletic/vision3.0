import { useEffect } from 'react';

import { fetchSatellites } from '../../../services/integrations/satellitesService';
import { takeStartupSatellites } from '../../../services/startup/startupBootstrap';
import { getLayerVisualConfig } from '../../layer-config/layerVisualConfig';
import { ensureSatelliteDataSource, renderSatellites } from '../services/satelliteLayerPresenter';
import { setSatelliteUiStatus } from '../services/satelliteUiTelemetry';

import type { MutableRefObject } from 'react';
import type { Viewer } from 'cesium';

const FAST_TICK_MS = 8000;
const STANDARD_POLL_MS = 20000;
const ADVANCED_POLL_MS = 9000;
const BOOTSTRAP_INTERVAL_MS = 1400;
const EVENT_REFRESH_DEBOUNCE_MS = 220;

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
    let hasRenderedDataOnce = false;
    let lastRefreshAt = 0;
    let refreshQueuedTimer: number | null = null;
    let lastEnabledState: boolean | null = null;
    let startupSatellites = takeStartupSatellites();

    async function refresh(force = false) {
      if (refreshInFlight) {
        return;
      }

      refreshInFlight = true;
      const viewer = viewerRef.current;
      if (!viewer) {
        refreshInFlight = false;
        return;
      }

      const config = getLayerVisualConfig('satellites');
      const pollInterval = config.advancedSatellites ? ADVANCED_POLL_MS : STANDARD_POLL_MS;
      const now = Date.now();
      if (!force && now - lastRefreshAt < pollInterval) {
        refreshInFlight = false;
        return;
      }

      try {
        const enabled = isSatelliteLayerEnabled();
        if (!enabled) {
          if (lastEnabledState !== false) {
            const dataSource = await ensureSatelliteDataSource(viewer);
            dataSource.entities.removeAll();
            viewer.scene.requestRender();
          }
          lastEnabledState = false;
          setSatelliteUiStatus('CelesTrak · disabled', 0);
          refreshInFlight = false;
          return;
        }

        if (document.hidden) {
          refreshInFlight = false;
          return;
        }

        const satellites = !config.advancedSatellites
          && Array.isArray(startupSatellites)
          && startupSatellites.length > 0
          ? startupSatellites
          : await fetchSatellites(config.advancedSatellites);
        startupSatellites = null;
        if (!alive) {
          refreshInFlight = false;
          return;
        }

        await renderSatellites(viewer, satellites);
        lastEnabledState = true;
        lastRefreshAt = now;
        if (satellites.length > 0) {
          hasRenderedDataOnce = true;
        }
        if (config.advancedSatellites) {
          setSatelliteUiStatus(`CelesTrak · advanced live`, satellites.length);
        }
      } catch (error) {
        setSatelliteUiStatus('CelesTrak · waiting...', 0);
        console.error('Failed to load satellites layer', error);
      } finally {
        refreshInFlight = false;
      }
    }

    const queueRefresh = (delayMs = EVENT_REFRESH_DEBOUNCE_MS) => {
      if (!alive) {
        return;
      }
      if (refreshQueuedTimer !== null) {
        window.clearTimeout(refreshQueuedTimer);
      }
      refreshQueuedTimer = window.setTimeout(() => {
        refreshQueuedTimer = null;
        void refresh(true);
      }, delayMs);
    };

    void refresh();
    const bootstrapIntervalId = window.setInterval(() => {
      if (!alive || hasRenderedDataOnce) {
        return;
      }
      void refresh(true);
    }, BOOTSTRAP_INTERVAL_MS);
    const intervalId = window.setInterval(() => void refresh(), FAST_TICK_MS);

    const configChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ layer: string }>).detail;
      if (!detail || detail.layer !== 'satellites') {
        return;
      }

      queueRefresh();
    };

    const layerToggleChanged = () => {
      queueRefresh();
    };

    window.addEventListener('vision:layer-config-changed', configChanged);
    window.addEventListener('vision:layer-toggle-changed', layerToggleChanged);
    window.addEventListener('vision:layer-group-toggled', layerToggleChanged);

    return () => {
      alive = false;
      if (refreshQueuedTimer !== null) {
        window.clearTimeout(refreshQueuedTimer);
      }
      window.clearInterval(bootstrapIntervalId);
      window.clearInterval(intervalId);
      window.removeEventListener('vision:layer-config-changed', configChanged);
      window.removeEventListener('vision:layer-toggle-changed', layerToggleChanged);
      window.removeEventListener('vision:layer-group-toggled', layerToggleChanged);
    };
  }, [viewerRef]);
}
