import { useEffect } from 'react';

import { applyAccent, setHidden, setText } from '../utils/domUi';
import { WORLD_TEXTURE_FILTERS, getLayerSectionsInDisplayOrder, updateEffectSliders, updateLayerSection } from '../utils/uiRuntimeHelpers';

export function useLegacyShellUi() {
  useEffect(() => {
    let sectionIndex = 0;
    const STYLE_PRESET_CLASSES = ['preset-normal', 'preset-crt', 'preset-nvg', 'preset-noir', 'preset-spotlight', 'preset-flir'];

    const styleButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.style-btn[data-style]'));
    const presetButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.mini-preset-btn[data-performance-preset]'));
    const focusButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.focus-mode-btn[data-camera-focus]'));
    const accentButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-accent-preset]'));
    const worldButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-world-texture]'));
    const DEFAULT_CAMERA_FOCUS = 'crosshair';
    const DEFAULT_WORLD_TEXTURE = 'hyperreal-earth';

    const setToggleState = (node: HTMLButtonElement, enabled: boolean) => {
      node.classList.toggle('on', enabled);
      node.classList.toggle('off', !enabled);
      node.textContent = enabled ? 'ON' : 'OFF';
    };

    const setGroupEnabled = (section: HTMLElement, enabled: boolean) => {
      section.classList.toggle('group-off', !enabled);
      section.querySelectorAll<HTMLButtonElement>('button[data-toggle]').forEach((node) => {
        setToggleState(node, enabled);
      });
    };

    const syncStyleLabel = () => {
      const activeStyles = styleButtons
        .filter((node) => node.classList.contains('active'))
        .map((node) => (node.getAttribute('data-style') ?? '').toUpperCase())
        .filter(Boolean);
      setText('activeStyleLabel', activeStyles.length ? activeStyles.join(' + ') : 'NORMAL');
    };

    const applyPerformancePreset = (preset: string) => {
      const handler = (window as Window & { __applyPerformancePreset?: (value: string) => void }).__applyPerformancePreset;
      handler?.(preset);
    };

    const applyCameraFocusMode = (modeValue: string) => {
      const mode = modeValue === 'mouse' ? 'mouse' : 'crosshair';
      focusButtons.forEach((node) => node.classList.toggle('active', node.getAttribute('data-camera-focus') === mode));
      setText('cameraFocusHint', mode === 'crosshair' ? 'Zoom/rotate around center crosshair.' : 'Zoom/rotate follow mouse pointer.');
      (window as Window & { __setCameraFocusMode?: (value: 'mouse' | 'crosshair') => void }).__setCameraFocusMode?.(mode);
    };

    const applyWorldTexturePreset = (presetValue: string) => {
      const hasPresetButton = worldButtons.some((node) => node.getAttribute('data-world-texture') === presetValue);
      const preset = hasPresetButton ? presetValue : DEFAULT_WORLD_TEXTURE;
      worldButtons.forEach((node) => node.classList.toggle('active', node.getAttribute('data-world-texture') === preset));
      const filter = WORLD_TEXTURE_FILTERS[preset] ?? WORLD_TEXTURE_FILTERS[DEFAULT_WORLD_TEXTURE] ?? 'saturate(1)';
      document.documentElement.style.setProperty('--world-tex-filter', 'none');
      document.documentElement.style.setProperty('--google-2d-filter', filter);
      window.__applyWorldTexturePreset?.(preset);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const button = target.closest('button');
      if (!button) {
        return;
      }

      if (button.matches('.style-btn[data-style]')) {
        const style = button.getAttribute('data-style') ?? 'normal';
        if (style === 'normal') {
          STYLE_PRESET_CLASSES.forEach((className) => document.body.classList.remove(className));
          document.body.classList.add('preset-normal');
          styleButtons.forEach((node) => node.classList.toggle('active', node.getAttribute('data-style') === 'normal'));
          setHidden('spotlightControlCard', true);
          syncStyleLabel();
          return;
        }

        const wasActive = button.classList.contains('active');
        const normalButton = styleButtons.find((node) => node.getAttribute('data-style') === 'normal');
        normalButton?.classList.remove('active');
        document.body.classList.remove('preset-normal');

        button.classList.toggle('active', !wasActive);
        document.body.classList.toggle(`preset-${style}`, !wasActive);

        const activeNonNormal = styleButtons.some((node) => {
          const nodeStyle = node.getAttribute('data-style');
          return nodeStyle !== 'normal' && node.classList.contains('active');
        });
        if (!activeNonNormal) {
          normalButton?.classList.add('active');
          document.body.classList.add('preset-normal');
        }

        setHidden('spotlightControlCard', !document.body.classList.contains('preset-spotlight'));
        syncStyleLabel();
        return;
      }

      if (button.matches('.mini-preset-btn[data-performance-preset]')) {
        const preset = button.getAttribute('data-performance-preset') ?? 'balanced';
        presetButtons.forEach((node) => node.classList.toggle('active', node === button));
        document.documentElement.style.setProperty('--noise', preset === 'quality' ? '0.16' : preset === 'balanced' ? '0.1' : '0.05');
        applyPerformancePreset(preset);
        setText('searchStatus', `Performance preset: ${preset.toUpperCase()}.`);
        return;
      }

      if (button.hasAttribute('data-toggle')) {
        const enabled = button.classList.contains('on');
        button.classList.toggle('on', !enabled);
        button.classList.toggle('off', enabled);
        button.textContent = enabled ? 'OFF' : 'ON';
        window.dispatchEvent(new CustomEvent('vision:layer-toggle-changed', { detail: { layer: button.getAttribute('data-toggle'), enabled: !enabled } }));
        setText('layerHealth', `LINK: ${(button.getAttribute('data-toggle') ?? 'layer')} ${enabled ? 'OFFLINE' : 'ONLINE'}`);
        return;
      }

      if (button.id === 'layerGroupPrev' || button.id === 'layerGroupNext' || button.dataset.layerSectionIndex) {
        if (button.id === 'layerGroupPrev') {
          sectionIndex -= 1;
        } else if (button.id === 'layerGroupNext') {
          sectionIndex += 1;
        } else {
          sectionIndex = Number(button.dataset.layerSectionIndex ?? '0');
        }

        updateLayerSection(sectionIndex);
        return;
      }

      if (button.id === 'layerGroupActive' || target.closest('.layer-section-header h3')) {
        const sections = getLayerSectionsInDisplayOrder();
        if (!sections.length) {
          return;
        }

        const activeIndex = ((sectionIndex % sections.length) + sections.length) % sections.length;
        const section = sections[activeIndex];
        if (!section) {
          return;
        }

        const enable = section.classList.contains('group-off');
        setGroupEnabled(section, enable);
        window.dispatchEvent(new CustomEvent('vision:layer-group-toggled', { detail: { group: section.dataset.layerGroup, enabled: enable } }));
        updateLayerSection(sectionIndex);
        setText('layerHealth', `LINK: ${(section.dataset.layerGroup ?? 'group').toUpperCase()} ${enable ? 'ONLINE' : 'OFFLINE'}`);
        return;
      }

      if (button.id === 'profileSettingsBtn' || button.id === 'profileSettingsCloseBtn') {
        setHidden('profileSettingsPanel', button.id !== 'profileSettingsBtn');
        return;
      }

      if (button.matches('.profile-settings-tab-btn[data-settings-tab]')) {
        const tab = button.getAttribute('data-settings-tab');
        document.getElementById('profileTabUserSettings')?.classList.toggle('active', tab === 'user-settings');
        document.getElementById('profileTabPreferences')?.classList.toggle('active', tab === 'preferences');
        setHidden('profileSettingsUserPanel', tab !== 'user-settings');
        setHidden('profileSettingsPreferencesPanel', tab !== 'preferences');
        return;
      }

      if (button.id === 'apiGuideBtn' || button.id === 'apiGuideCloseBtn') {
        setHidden('apiGuidePanel', button.id !== 'apiGuideBtn');
        return;
      }

      if (button.id === 'aiDecisionBtn') {
        const hidden = document.getElementById('intelPanel')?.classList.contains('hidden') ?? true;
        setHidden('intelPanel', !hidden);
        return;
      }

      if (button.id === 'intelPanelCloseBtn') {
        setHidden('intelPanel', true);
        return;
      }

      if (button.id === 'sessionRecordBtn') {
        const open = document.getElementById('recordingPanel')?.classList.contains('hidden') ?? true;
        setHidden('recordingPanel', !open);
        button.setAttribute('aria-pressed', open ? 'true' : 'false');
        setText('recordingNote', open ? 'Recording controls open.' : 'Recording controls hidden.');
        return;
      }

      if (button.id === 'recordingCloseBtn') {
        setHidden('recordingPanel', true);
        return;
      }

      if (button.id === 'afkModeBtn') {
        const hidden = document.getElementById('visionTerminalPanel')?.classList.contains('hidden') ?? true;
        setHidden('visionTerminalPanel', !hidden);
        document.body.classList.toggle('vision-terminal-active', hidden);
        return;
      }

      if (button.id === 'mapFullscreenToggle') {
        document.body.classList.toggle('map-fullscreen');
        return;
      }

      if (button.id === 'cleanUi') {
        const enabled = !document.body.classList.contains('clean-ui');
        document.body.classList.toggle('clean-ui', enabled);
        button.textContent = enabled ? 'SHOW CROSSHAIR' : 'HIDE CROSSHAIR';
        return;
      }

      if (button.id === 'mapModeToggleBtn') {
        const to2d = !document.body.classList.contains('map-2d-active');
        document.body.classList.toggle('map-2d-active', to2d);
        button.textContent = to2d ? '3D' : '2D';
        setText('searchStatus', to2d ? '2D map mode enabled.' : '3D map mode enabled.');
        return;
      }

      if (button.matches('.focus-mode-btn[data-camera-focus]')) {
        const mode = button.getAttribute('data-camera-focus') ?? DEFAULT_CAMERA_FOCUS;
        applyCameraFocusMode(mode);
        return;
      }

      if (button.id === 'customShaderToggle') {
        const pressed = button.getAttribute('aria-pressed') === 'true';
        button.setAttribute('aria-pressed', pressed ? 'false' : 'true');
        button.classList.toggle('on', !pressed);
        button.classList.toggle('off', pressed);
        button.textContent = pressed ? 'OFF' : 'ON';
        document.body.classList.toggle('preset-custom', !pressed);
        return;
      }

      if (button.matches('[data-accent-preset]')) {
        const accent = button.getAttribute('data-accent-preset') ?? '#26c9ff';
        accentButtons.forEach((node) => node.classList.toggle('active', node === button));
        const input = document.getElementById('customAccentColor') as HTMLInputElement | null;
        if (input) {
          input.value = accent;
        }

        applyAccent(accent);
        return;
      }

      if (button.id === 'customThemeReset') {
        applyAccent('#26c9ff');
        return;
      }

      if (button.matches('[data-world-texture]')) {
        const preset = button.getAttribute('data-world-texture') || DEFAULT_WORLD_TEXTURE;
        applyWorldTexturePreset(preset);
        return;
      }

      if (button.id === 'earthRecenterBtn') {
        (window as Window & { __recenterEarth?: () => void }).__recenterEarth?.();
        const mapModeToggle = document.getElementById('mapModeToggleBtn');
        if (mapModeToggle) {
          mapModeToggle.textContent = '2D';
        }

        setText('searchStatus', 'Camera recentered to default Earth view.');
      }
    };

    const onInput = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && ['pixelation', 'distortion', 'instability', 'sceneBlur', 'bloomStrength', 'sharpenStrength', 'spotlightStrength'].includes(target.id)) {
        updateEffectSliders();
      }

      if (target instanceof HTMLInputElement && target.id === 'customAccentColor') {
        applyAccent(target.value);
      }
    };

    updateLayerSection(0);
    updateEffectSliders();
    applyAccent('#26c9ff');
    applyPerformancePreset(presetButtons.find((node) => node.classList.contains('active'))?.getAttribute('data-performance-preset') ?? 'balanced');
    applyWorldTexturePreset(worldButtons.find((node) => node.classList.contains('active'))?.getAttribute('data-world-texture') ?? DEFAULT_WORLD_TEXTURE);
    applyCameraFocusMode(focusButtons.find((node) => node.classList.contains('active'))?.getAttribute('data-camera-focus') ?? DEFAULT_CAMERA_FOCUS);
    syncStyleLabel();
    setText('userTelemetry', 'LOC: PERMISSION_GRANTED');
    setText('orbitalMeta', 'ORB: READY');
    setText('layerHealth', 'LINK: STABLE');

    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);

    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('input', onInput);
    };
  }, []);
}
