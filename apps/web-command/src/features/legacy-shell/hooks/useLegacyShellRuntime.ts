import { useEffect } from 'react';

import { useLegacyAddonPanels } from './useLegacyAddonPanels';
import { useLegacyCctvAddon } from './useLegacyCctvAddon';
import { useLegacyShellFlightFocus } from './useLegacyShellFlightFocus';
import { useLegacyLayerConfigPanel } from './useLegacyLayerConfigPanel';
import { useLegacyLocationSearch } from './useLegacyLocationSearch';
import { useLegacyMetadataSpoofingAddon } from './useLegacyMetadataSpoofingAddon';
import { useLegacyStaticProfilingAddon } from './useLegacyStaticProfilingAddon';
import { useLegacyShellUi } from './useLegacyShellUi';

import type { MutableRefObject } from 'react';
import type { Viewer } from 'cesium';

export function useLegacyShellRuntime(viewerRef: MutableRefObject<Viewer | null>) {
  useLegacyShellUi();
  useLegacyShellFlightFocus(viewerRef);
  useLegacyLayerConfigPanel();
  useLegacyLocationSearch(viewerRef);
  useLegacyAddonPanels();
  useLegacyMetadataSpoofingAddon();
  useLegacyStaticProfilingAddon();
  useLegacyCctvAddon(viewerRef);

  useEffect(() => {
    const bootStartedAt = performance.now();
    let hideTimer: number | null = null;
    const MIN_BOOT_VISIBILITY_MS = 1250;
    const FALLBACK_HIDE_MS = 12000;
    const initialPreset = document
      .querySelector<HTMLButtonElement>('.mini-preset-btn[data-performance-preset].active')
      ?.getAttribute('data-performance-preset');
    const qualityBootGateEnabled = initialPreset === 'quality';
    let startupReady = Boolean(window.__visionStartupReady);
    let globeReady = !qualityBootGateEnabled || Boolean(window.__visionGlobeReady);

    const hideBoot = () => {
      const boot = document.getElementById('visionBoot');
      if (boot) {
        boot.classList.add('hidden');
        boot.setAttribute('aria-hidden', 'true');
      }
      document.body.classList.add('boot-complete');
    };

    const queueHideBoot = () => {
      const elapsed = performance.now() - bootStartedAt;
      const remaining = Math.max(0, MIN_BOOT_VISIBILITY_MS - elapsed);
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
      }
      hideTimer = window.setTimeout(hideBoot, remaining);
    };

    const tryCompleteBoot = () => {
      if (startupReady && globeReady) {
        queueHideBoot();
      }
    };

    const onStartupReady = () => {
      startupReady = true;
      tryCompleteBoot();
    };

    const onGlobeReady = () => {
      globeReady = true;
      tryCompleteBoot();
    };

    if (!startupReady) {
      window.addEventListener('vision:startup-ready', onStartupReady, { once: true });
    }
    if (!globeReady) {
      window.addEventListener('vision:globe-ready', onGlobeReady, { once: true });
    }
    tryCompleteBoot();
    hideTimer = window.setTimeout(queueHideBoot, FALLBACK_HIDE_MS);

    return () => {
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
      }
      window.removeEventListener('vision:startup-ready', onStartupReady);
      window.removeEventListener('vision:globe-ready', onGlobeReady);
    };
  }, []);
}
