import { useEffect } from 'react';

import { resetLayerVisualConfigStorage } from '../../layer-config/layerVisualConfig';
import { clearLegacyShellSettings, loadLegacyShellSettings, saveLegacyShellLayerToggle, saveLegacyShellSettings } from '../utils/legacyUserSettings';
import { applyAccent, setHidden, setText } from '../utils/domUi';
import { WORLD_TEXTURE_FILTERS, getLayerSectionsInDisplayOrder, updateEffectSliders, updateLayerSection } from '../utils/uiRuntimeHelpers';

const DEFAULT_CAMERA_FOCUS = 'crosshair';
const DEFAULT_WORLD_TEXTURE = 'hyperreal-earth';
const DEFAULT_ACCENT = '#26c9ff';
const DEFAULT_PERFORMANCE_PRESET = 'balanced';
const CARDINAL_SEQUENCE = ['north', 'east', 'south', 'west'] as const;
const EFFECT_SLIDER_IDS = ['pixelation', 'distortion', 'instability', 'sceneBlur', 'bloomStrength', 'sharpenStrength', 'spotlightStrength'] as const;

function isHexColor(value: string | undefined) {
  return Boolean(value && /^#[0-9a-fA-F]{6}$/.test(value.trim()));
}

export function useLegacyShellUi() {
  useEffect(() => {
    let sectionIndex = 0;
    const STYLE_PRESET_CLASSES = ['preset-normal', 'preset-crt', 'preset-nvg', 'preset-noir', 'preset-spotlight', 'preset-flir'];
    const savedSettings = loadLegacyShellSettings();

    const styleButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.style-btn[data-style]'));
    const presetButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.mini-preset-btn[data-performance-preset]'));
    const focusButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.focus-mode-btn[data-camera-focus]'));
    const accentButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-accent-preset]'));
    const worldButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-world-texture]'));

    const setToggleState = (node: HTMLButtonElement, enabled: boolean) => {
      node.classList.toggle('on', enabled);
      node.classList.toggle('off', !enabled);
      node.textContent = enabled ? 'ON' : 'OFF';
    };

    const captureLayerToggles = () => {
      const toggles: Record<string, boolean> = {};
      document.querySelectorAll<HTMLButtonElement>('button[data-toggle]').forEach((node) => {
        const key = node.getAttribute('data-toggle');
        if (!key) {
          return;
        }
        toggles[key] = node.classList.contains('on');
      });
      return toggles;
    };

    const captureEffectSliders = () => {
      const sliderValues: Record<string, string> = {};
      EFFECT_SLIDER_IDS.forEach((id) => {
        const input = document.getElementById(id) as HTMLInputElement | null;
        if (!input) {
          return;
        }
        sliderValues[id] = input.value;
      });
      return sliderValues;
    };

    const captureStyleModes = () => {
      const activeStyles = styleButtons
        .filter((node) => node.classList.contains('active'))
        .map((node) => node.getAttribute('data-style') ?? '')
        .filter(Boolean);
      return activeStyles;
    };

    const persistCurrentState = () => {
      const focusMode = focusButtons.find((node) => node.classList.contains('active'))?.getAttribute('data-camera-focus') ?? DEFAULT_CAMERA_FOCUS;
      const performancePreset = presetButtons.find((node) => node.classList.contains('active'))?.getAttribute('data-performance-preset') ?? DEFAULT_PERFORMANCE_PRESET;
      const worldTexturePreset = worldButtons.find((node) => node.classList.contains('active'))?.getAttribute('data-world-texture') ?? DEFAULT_WORLD_TEXTURE;
      const accentInput = document.getElementById('customAccentColor') as HTMLInputElement | null;
      saveLegacyShellSettings({
        layerToggles: captureLayerToggles(),
        styleModes: captureStyleModes(),
        performancePreset,
        cameraFocusMode: focusMode === 'mouse' ? 'mouse' : 'crosshair',
        worldTexturePreset,
        accentColor: isHexColor(accentInput?.value) ? accentInput?.value.trim() : DEFAULT_ACCENT,
        customShaderEnabled: document.body.classList.contains('preset-custom'),
        mapFullscreen: document.body.classList.contains('map-fullscreen'),
        cleanUi: document.body.classList.contains('clean-ui'),
        mapMode2d: false,
        effectSliders: captureEffectSliders(),
      });
    };

    const syncLayerGroupVisualState = () => {
      const sections = getLayerSectionsInDisplayOrder();
      sections.forEach((section) => {
        const layerToggles = Array.from(section.querySelectorAll<HTMLButtonElement>('button[data-toggle]'));
        if (!layerToggles.length) {
          return;
        }

        const hasEnabledLayer = layerToggles.some((node) => node.classList.contains('on'));
        section.classList.toggle('group-off', !hasEnabledLayer);
      });
    };

    const setGroupEnabled = (section: HTMLElement, enabled: boolean) => {
      section.classList.toggle('group-off', !enabled);
      section.querySelectorAll<HTMLButtonElement>('button[data-toggle]').forEach((node) => {
        setToggleState(node, enabled);
        const key = node.getAttribute('data-toggle');
        if (key) {
          saveLegacyShellLayerToggle(key, enabled);
        }
      });
    };

    const syncStyleLabel = () => {
      const activeStyles = styleButtons
        .filter((node) => node.classList.contains('active'))
        .map((node) => (node.getAttribute('data-style') ?? '').toUpperCase())
        .filter(Boolean);
      setText('activeStyleLabel', activeStyles.length ? activeStyles.join(' + ') : 'NORMAL');
    };

    const applySavedStyleModes = () => {
      const savedStyles = (savedSettings.styleModes ?? []).filter(Boolean);
      if (!savedStyles.length) {
        return;
      }

      const normalizedSavedStyles = new Set(savedStyles);
      let anyNonNormalActive = false;
      styleButtons.forEach((node) => {
        const style = node.getAttribute('data-style') ?? 'normal';
        const shouldActivate = normalizedSavedStyles.has(style);
        node.classList.toggle('active', shouldActivate);
        if (style !== 'normal') {
          document.body.classList.toggle(`preset-${style}`, shouldActivate);
          anyNonNormalActive = anyNonNormalActive || shouldActivate;
        }
      });

      const normalButton = styleButtons.find((node) => node.getAttribute('data-style') === 'normal');
      if (normalButton) {
        normalButton.classList.toggle('active', !anyNonNormalActive || normalizedSavedStyles.has('normal'));
      }
      if (!anyNonNormalActive) {
        document.body.classList.add('preset-normal');
      } else {
        document.body.classList.remove('preset-normal');
      }

      setHidden('spotlightControlCard', !document.body.classList.contains('preset-spotlight'));
    };

    const applyPerformancePreset = (preset: string) => {
      const handler = (window as Window & { __applyPerformancePreset?: (value: string) => void }).__applyPerformancePreset;
      handler?.(preset);
    };

    const applyCameraFocusMode = (modeValue: string, persist = true) => {
      const mode = modeValue === 'mouse' ? 'mouse' : 'crosshair';
      focusButtons.forEach((node) => node.classList.toggle('active', node.getAttribute('data-camera-focus') === mode));
      setText('cameraFocusHint', mode === 'crosshair' ? 'Zoom/rotate around center crosshair.' : 'Zoom/rotate follow mouse pointer.');
      (window as Window & { __setCameraFocusMode?: (value: 'mouse' | 'crosshair') => void }).__setCameraFocusMode?.(mode);
      if (persist) {
        saveLegacyShellSettings({ cameraFocusMode: mode });
      }
    };

    const applyWorldTexturePreset = (presetValue: string, persist = true) => {
      const hasPresetButton = worldButtons.some((node) => node.getAttribute('data-world-texture') === presetValue);
      const preset = hasPresetButton ? presetValue : DEFAULT_WORLD_TEXTURE;
      worldButtons.forEach((node) => node.classList.toggle('active', node.getAttribute('data-world-texture') === preset));
      const filter = WORLD_TEXTURE_FILTERS[preset] ?? WORLD_TEXTURE_FILTERS[DEFAULT_WORLD_TEXTURE] ?? 'saturate(1)';
      document.documentElement.style.setProperty('--world-tex-filter', filter);
      document.documentElement.style.setProperty('--google-2d-filter', filter);
      window.__applyWorldTexturePreset?.(preset);
      if (persist) {
        saveLegacyShellSettings({ worldTexturePreset: preset });
      }
    };

    const applySavedLayerToggles = () => {
      const savedToggles = savedSettings.layerToggles ?? {};
      if (!Object.keys(savedToggles).length) {
        return;
      }

      document.querySelectorAll<HTMLButtonElement>('button[data-toggle]').forEach((node) => {
        const key = node.getAttribute('data-toggle');
        if (!key || !(key in savedToggles)) {
          return;
        }
        setToggleState(node, Boolean(savedToggles[key]));
      });
      syncLayerGroupVisualState();
    };

    const applySavedEffectSliders = () => {
      const sliderValues = savedSettings.effectSliders;
      if (!sliderValues) {
        return;
      }

      EFFECT_SLIDER_IDS.forEach((id) => {
        const value = sliderValues[id];
        if (typeof value !== 'string') {
          return;
        }

        const input = document.getElementById(id) as HTMLInputElement | null;
        if (input) {
          input.value = value;
        }
      });
    };

    const applySavedAccent = () => {
      const accent = isHexColor(savedSettings.accentColor) ? savedSettings.accentColor!.trim() : DEFAULT_ACCENT;
      const input = document.getElementById('customAccentColor') as HTMLInputElement | null;
      if (input) {
        input.value = accent;
      }
      accentButtons.forEach((node) => node.classList.toggle('active', node.getAttribute('data-accent-preset') === accent));
      applyAccent(accent);
    };

    const applySavedToggles = () => {
      const customShaderButton = document.getElementById('customShaderToggle');
      const shaderEnabled = savedSettings.customShaderEnabled ?? false;
      if (customShaderButton) {
        customShaderButton.setAttribute('aria-pressed', shaderEnabled ? 'true' : 'false');
        customShaderButton.classList.toggle('on', shaderEnabled);
        customShaderButton.classList.toggle('off', !shaderEnabled);
        customShaderButton.textContent = shaderEnabled ? 'ON' : 'OFF';
      }
      document.body.classList.toggle('preset-custom', shaderEnabled);

      document.body.classList.toggle('map-fullscreen', savedSettings.mapFullscreen ?? false);
      document.body.classList.toggle('clean-ui', savedSettings.cleanUi ?? false);
      document.body.classList.remove('map-2d-active');

      const cleanUiButton = document.getElementById('cleanUi');
      if (cleanUiButton) {
        cleanUiButton.textContent = document.body.classList.contains('clean-ui') ? 'SHOW CROSSHAIR' : 'HIDE CROSSHAIR';
      }

      const cardinalViewButton = document.getElementById('cardinalViewCycleBtn');
      if (cardinalViewButton) {
        cardinalViewButton.textContent = 'N';
        cardinalViewButton.setAttribute('title', 'Cycle cardinal camera view (next: north)');
        cardinalViewButton.setAttribute('aria-label', 'Cycle cardinal camera view (next: north)');
      }
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
          saveLegacyShellSettings({ styleModes: ['normal'] });
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
        saveLegacyShellSettings({ styleModes: captureStyleModes() });
        return;
      }

      if (button.matches('.mini-preset-btn[data-performance-preset]')) {
        const preset = button.getAttribute('data-performance-preset') ?? DEFAULT_PERFORMANCE_PRESET;
        presetButtons.forEach((node) => node.classList.toggle('active', node === button));
        document.documentElement.style.setProperty('--noise', preset === 'quality' ? '0.16' : preset === 'balanced' ? '0.1' : '0.05');
        applyPerformancePreset(preset);
        setText('searchStatus', `Performance preset: ${preset.toUpperCase()}.`);
        saveLegacyShellSettings({ performancePreset: preset });
        return;
      }

      if (button.hasAttribute('data-toggle')) {
        const enabled = button.classList.contains('on');
        const nextEnabled = !enabled;
        button.classList.toggle('on', nextEnabled);
        button.classList.toggle('off', !nextEnabled);
        button.textContent = nextEnabled ? 'ON' : 'OFF';

        const layerKey = button.getAttribute('data-toggle');
        if (layerKey) {
          saveLegacyShellLayerToggle(layerKey, nextEnabled);
        }

        syncLayerGroupVisualState();
        window.dispatchEvent(new CustomEvent('vision:layer-toggle-changed', { detail: { layer: layerKey, enabled: nextEnabled } }));
        setText('layerHealth', `LINK: ${(layerKey ?? 'layer')} ${enabled ? 'OFFLINE' : 'ONLINE'}`);
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

      if (button.id === 'profileSettingsSaveBtn') {
        persistCurrentState();
        setText('searchStatus', 'Settings saved to local profile.');
        return;
      }

      if (button.id === 'profileSettingsResetBtn') {
        clearLegacyShellSettings();
        resetLayerVisualConfigStorage();
        window.location.reload();
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
        const enabled = !document.body.classList.contains('map-fullscreen');
        document.body.classList.toggle('map-fullscreen', enabled);
        saveLegacyShellSettings({ mapFullscreen: enabled });
        return;
      }

      if (button.id === 'cleanUi') {
        const enabled = !document.body.classList.contains('clean-ui');
        document.body.classList.toggle('clean-ui', enabled);
        button.textContent = enabled ? 'SHOW CROSSHAIR' : 'HIDE CROSSHAIR';
        saveLegacyShellSettings({ cleanUi: enabled });
        return;
      }

      if (button.id === 'cardinalViewCycleBtn') {
        const cycleResult = window.__cycleCardinalView?.();
        if (!cycleResult) {
          setText('searchStatus', 'No target available. Search for a place or center the crosshair on a location.');
          return;
        }

        const nextLabel = cycleResult.nextDirection.slice(0, 1).toUpperCase();
        button.textContent = nextLabel;
        button.setAttribute('title', `Cycle cardinal camera view (next: ${cycleResult.nextDirection})`);
        button.setAttribute('aria-label', `Cycle cardinal camera view (next: ${cycleResult.nextDirection})`);
        setText('searchStatus', `Cardinal view: ${cycleResult.direction.toUpperCase()} · ${cycleResult.targetLabel}`);
        return;
      }

      if (button.matches('.focus-mode-btn[data-camera-focus]')) {
        const mode = button.getAttribute('data-camera-focus') ?? DEFAULT_CAMERA_FOCUS;
        applyCameraFocusMode(mode);
        return;
      }

      if (button.id === 'customShaderToggle') {
        const pressed = button.getAttribute('aria-pressed') === 'true';
        const enabled = !pressed;
        button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        button.classList.toggle('on', enabled);
        button.classList.toggle('off', !enabled);
        button.textContent = enabled ? 'ON' : 'OFF';
        document.body.classList.toggle('preset-custom', enabled);
        saveLegacyShellSettings({ customShaderEnabled: enabled });
        return;
      }

      if (button.matches('[data-accent-preset]')) {
        const accent = button.getAttribute('data-accent-preset') ?? DEFAULT_ACCENT;
        accentButtons.forEach((node) => node.classList.toggle('active', node === button));
        const input = document.getElementById('customAccentColor') as HTMLInputElement | null;
        if (input) {
          input.value = accent;
        }

        applyAccent(accent);
        saveLegacyShellSettings({ accentColor: accent });
        return;
      }

      if (button.id === 'customThemeReset') {
        applyAccent(DEFAULT_ACCENT);
        const input = document.getElementById('customAccentColor') as HTMLInputElement | null;
        if (input) {
          input.value = DEFAULT_ACCENT;
        }
        accentButtons.forEach((node) => node.classList.toggle('active', node.getAttribute('data-accent-preset') === DEFAULT_ACCENT));
        saveLegacyShellSettings({ accentColor: DEFAULT_ACCENT });
        return;
      }

      if (button.matches('[data-world-texture]')) {
        const preset = button.getAttribute('data-world-texture') || DEFAULT_WORLD_TEXTURE;
        applyWorldTexturePreset(preset);
        return;
      }

      if (button.id === 'earthRecenterBtn') {
        (window as Window & { __recenterEarth?: () => void }).__recenterEarth?.();
        const cardinalViewButton = document.getElementById('cardinalViewCycleBtn');
        if (cardinalViewButton) {
          cardinalViewButton.textContent = CARDINAL_SEQUENCE[0].slice(0, 1).toUpperCase();
          cardinalViewButton.setAttribute('title', 'Cycle cardinal camera view (next: north)');
          cardinalViewButton.setAttribute('aria-label', 'Cycle cardinal camera view (next: north)');
        }

        setText('searchStatus', 'Camera recentered to default Earth view.');
      }
    };

    const onInput = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && EFFECT_SLIDER_IDS.includes(target.id as (typeof EFFECT_SLIDER_IDS)[number])) {
        updateEffectSliders();
        const current = loadLegacyShellSettings();
        saveLegacyShellSettings({
          effectSliders: {
            ...(current.effectSliders ?? {}),
            [target.id]: target.value,
          },
        });
      }

      if (target instanceof HTMLInputElement && target.id === 'customAccentColor') {
        applyAccent(target.value);
        if (isHexColor(target.value)) {
          saveLegacyShellSettings({ accentColor: target.value.trim() });
        }
      }
    };

    applySavedLayerToggles();
    applySavedEffectSliders();
    applySavedStyleModes();

    updateLayerSection(0);
    updateEffectSliders();
    applySavedAccent();

    const preferredPreset = savedSettings.performancePreset;
    const initialPresetButton = presetButtons.find((node) => node.getAttribute('data-performance-preset') === preferredPreset)
      ?? presetButtons.find((node) => node.classList.contains('active'));
    const initialPreset = initialPresetButton?.getAttribute('data-performance-preset') ?? DEFAULT_PERFORMANCE_PRESET;
    presetButtons.forEach((node) => node.classList.toggle('active', node === initialPresetButton));
    applyPerformancePreset(initialPreset);

    const preferredWorldTexture = savedSettings.worldTexturePreset ?? worldButtons.find((node) => node.classList.contains('active'))?.getAttribute('data-world-texture') ?? DEFAULT_WORLD_TEXTURE;
    applyWorldTexturePreset(preferredWorldTexture, false);

    const preferredFocus = savedSettings.cameraFocusMode
      ?? focusButtons.find((node) => node.classList.contains('active'))?.getAttribute('data-camera-focus')
      ?? DEFAULT_CAMERA_FOCUS;
    applyCameraFocusMode(preferredFocus, false);

    applySavedToggles();
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
