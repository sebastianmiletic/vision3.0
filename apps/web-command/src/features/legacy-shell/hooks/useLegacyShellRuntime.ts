import { useEffect } from 'react';

import { useLegacyAddonPanels } from './useLegacyAddonPanels';
import { useLegacyCctvAddon } from './useLegacyCctvAddon';
import { useLegacyShellFlightFocus } from './useLegacyShellFlightFocus';
import { useLegacyLayerConfigPanel } from './useLegacyLayerConfigPanel';
import { useLegacyLocationSearch } from './useLegacyLocationSearch';
import { useLegacyMetadataSpoofingAddon } from './useLegacyMetadataSpoofingAddon';
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
  useLegacyCctvAddon(viewerRef);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const boot = document.getElementById('visionBoot');
      if (boot) {
        boot.classList.add('hidden');
        boot.setAttribute('aria-hidden', 'true');
      }
    }, 3600);

    return () => window.clearTimeout(timer);
  }, []);
}
