import { useEffect } from 'react';

import { setHidden } from '../utils/domUi';

const ADDON_PANEL_MAP: Record<string, string> = {
  'key-locations': 'keyLocationsPanel',
  'place-inspector': 'placeInspectorPanel',
  'vzn-terminal': 'vznTerminalPanel',
  'metadata-spoofing': 'metadataSpoofingPanel',
  'static-profiling': 'staticProfilingPanel',
  'cctv-monitor': 'cctvMonitorPanel',
};

const CLOSE_BUTTON_IDS = new Set([
  'keyLocationsBackBtn',
  'placeInspectorBackBtn',
  'vznTerminalBackBtn',
  'metadataSpoofingBackBtn',
  'staticProfilingBackBtn',
  'cctvMonitorBackBtn',
]);

function hideAddonPanels() {
  Object.values(ADDON_PANEL_MAP).forEach((panelId) => setHidden(panelId, true));
}

function openAddonPanel(addonId: string) {
  const panelId = ADDON_PANEL_MAP[addonId];
  if (!panelId) {
    return;
  }

  hideAddonPanels();
  const leftRail = document.querySelector<HTMLElement>('.left-rail');
  leftRail?.classList.add('addon-open');
  setHidden('layersPanel', true);
  setHidden(panelId, false);
}

function closeAddonPanels() {
  hideAddonPanels();
  const leftRail = document.querySelector<HTMLElement>('.left-rail');
  leftRail?.classList.remove('addon-open');
  setHidden('layersPanel', false);
}

export function useLegacyAddonPanels() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const button = target.closest('button');

      const addonNode = target.closest<HTMLElement>('[data-addon-open]');
      const addonId = addonNode?.getAttribute('data-addon-open');
      if (addonId) {
        openAddonPanel(addonId);
        return;
      }

      if (button && CLOSE_BUTTON_IDS.has(button.id)) {
        closeAddonPanels();
      }
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
