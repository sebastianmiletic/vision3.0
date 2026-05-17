import { useEffect, useRef } from 'react';
import {
  Cartesian3,
  Cesium3DTileset,
  Color,
  EllipsoidTerrainProvider,
  Ion,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer,
} from 'cesium';

import { createPhotorealisticTileset } from '../services/tileProvider';

type PerformancePreset = 'quality' | 'balanced' | 'performance';
type CameraFocusMode = 'mouse' | 'crosshair';

const DEFAULT_CENTER = Cartesian3.fromDegrees(0, 0, 25000000);
const DEFAULT_ORIENTATION = {
  heading: 0,
  pitch: CesiumMath.toRadians(-90),
  roll: 0,
};
function normalizePreset(value: string | undefined): PerformancePreset {
  if (value === 'quality' || value === 'balanced' || value === 'performance') {
    return value;
  }

  return 'balanced';
}

function normalizeCameraFocusMode(value: string | undefined): CameraFocusMode {
  if (value === 'mouse') {
    return value;
  }

  return 'crosshair';
}

function applyPerformancePreset(viewer: Viewer, tileset: Cesium3DTileset, preset: PerformancePreset) {
  const dpr = window.devicePixelRatio || 1;
  const scene = viewer.scene;
  const fxaaStage = scene.postProcessStages.fxaa;

  if (preset === 'quality') {
    viewer.targetFrameRate = 60;
    viewer.resolutionScale = Math.min(1.5, Math.max(1.15, dpr));
    fxaaStage.enabled = true;
    scene.globe.maximumScreenSpaceError = 0.9;
    tileset.maximumScreenSpaceError = 0.55;
    tileset.dynamicScreenSpaceError = false;
    tileset.skipLevelOfDetail = false;
    tileset.foveatedScreenSpaceError = false;
    return;
  }

  if (preset === 'balanced') {
    viewer.targetFrameRate = 45;
    viewer.resolutionScale = Math.min(1.05, Math.max(0.92, dpr * 0.92));
    fxaaStage.enabled = true;
    scene.globe.maximumScreenSpaceError = 1.8;
    tileset.maximumScreenSpaceError = 1.8;
    tileset.dynamicScreenSpaceError = true;
    tileset.skipLevelOfDetail = false;
    tileset.foveatedScreenSpaceError = false;
    return;
  }

  viewer.targetFrameRate = 30;
  viewer.resolutionScale = 0.75;
  fxaaStage.enabled = false;
  scene.globe.maximumScreenSpaceError = 2.8;
  tileset.maximumScreenSpaceError = 3.6;
  tileset.dynamicScreenSpaceError = true;
  tileset.skipLevelOfDetail = false;
  tileset.foveatedScreenSpaceError = false;
}

export function useCesiumViewer(containerId: string) {
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    let mounted = true;
    let handler: ScreenSpaceEventHandler | null = null;
    let viewer: Viewer | null = null;
    let cameraFocusMode: CameraFocusMode = 'crosshair';
    const provider = import.meta.env.VITE_TILE_PROVIDER ?? 'google';

    if (import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN) {
      Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN;
    }

    async function start() {
      const flatTerrainProvider = new EllipsoidTerrainProvider();

      viewer = new Viewer(containerId, {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        infoBox: false,
        fullscreenButton: false,
        terrainProvider: flatTerrainProvider,
      });

      if (viewer.scene.skyAtmosphere) {
        viewer.scene.skyAtmosphere.show = true;
      }
      if (viewer.scene.skyBox) {
        viewer.scene.skyBox.show = true;
      }
      viewer.scene.backgroundColor = Color.BLACK;
      viewer.scene.globe.depthTestAgainstTerrain = true;
      viewer.scene.globe.enableLighting = false;
      if (viewer.scene.fog) {
        viewer.scene.fog.enabled = false;
      }

      const tileset = await createPhotorealisticTileset({
        provider,
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      });
      if (!mounted) {
        return;
      }

      tileset.maximumScreenSpaceError = 1.1;
      tileset.dynamicScreenSpaceError = true;
      tileset.skipLevelOfDetail = false;
      tileset.foveatedScreenSpaceError = false;
      viewer.scene.primitives.add(tileset);

      const flyToDefaultEarthView = (duration: number) => {
        if (!viewer) {
          return;
        }

        viewer.trackedEntity = undefined;
        viewer.camera.flyTo({
          destination: DEFAULT_CENTER,
          orientation: DEFAULT_ORIENTATION,
          duration,
        });
      };

      viewer.camera.flyTo({
        destination: DEFAULT_CENTER,
        orientation: DEFAULT_ORIENTATION,
        duration: 2.2,
      });

      handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

      viewerRef.current = viewer;

      const applyCameraFocusMode = (modeValue: string | undefined) => {
        if (!viewer || !handler) {
          return;
        }

        cameraFocusMode = normalizeCameraFocusMode(modeValue);
        if (cameraFocusMode === 'crosshair') {
          handler.setInputAction((movement: unknown) => {
            if (!viewer) {
              return;
            }

            const movementWithDelta = movement as { delta?: unknown } | null;
            const rawDelta = typeof movement === 'number'
              ? movement
              : movementWithDelta && typeof movementWithDelta.delta === 'number'
                ? movementWithDelta.delta
                : 0;
            if (!rawDelta) {
              return;
            }

            const zoomAmount = Math.max(2500, Math.abs(rawDelta) * 900);
            if (rawDelta > 0) {
              viewer.camera.zoomOut(zoomAmount);
            } else {
              viewer.camera.zoomIn(zoomAmount);
            }
          }, ScreenSpaceEventType.WHEEL);
        } else {
          handler.removeInputAction(ScreenSpaceEventType.WHEEL);
        }
      };

      const applyPreset = (presetValue: string | undefined) => {
        if (!viewer) {
          return;
        }

        applyPerformancePreset(viewer, tileset, normalizePreset(presetValue));
      };

      const activePreset = document
        .querySelector<HTMLButtonElement>('.mini-preset-btn[data-performance-preset].active')
        ?.getAttribute('data-performance-preset');
      applyPreset(activePreset ?? undefined);
      const activeCameraFocus = document
        .querySelector<HTMLButtonElement>('.focus-mode-btn[data-camera-focus].active')
        ?.getAttribute('data-camera-focus');
      applyCameraFocusMode(activeCameraFocus ?? 'crosshair');

      (window as Window & { __recenterEarth?: () => void }).__recenterEarth = () => {
        document.body.classList.remove('map-2d-active', 'focus-data-active');
        flyToDefaultEarthView(1.4);
        window.dispatchEvent(new CustomEvent('vision:camera-reset'));
      };

      (window as Window & { __applyPerformancePreset?: (preset: string) => void }).__applyPerformancePreset = (preset: string) => {
        applyPreset(preset);
      };
      (window as Window & { __setCameraFocusMode?: (mode: 'mouse' | 'crosshair') => void }).__setCameraFocusMode = (mode: 'mouse' | 'crosshair') => {
        applyCameraFocusMode(mode);
      };
      (window as Window & { __getCameraFocusMode?: () => 'mouse' | 'crosshair' }).__getCameraFocusMode = () => cameraFocusMode;
    }

    start().catch((error) => {
      console.error('Failed to initialize Cesium viewer', error);
    });

    return () => {
      mounted = false;
      handler?.destroy();
      viewer?.destroy();
      viewerRef.current = null;
      (window as Window & { __recenterEarth?: () => void }).__recenterEarth = undefined;
      (window as Window & { __applyPerformancePreset?: (preset: string) => void }).__applyPerformancePreset = undefined;
      (window as Window & { __setCameraFocusMode?: (mode: 'mouse' | 'crosshair') => void }).__setCameraFocusMode = undefined;
      (window as Window & { __getCameraFocusMode?: () => 'mouse' | 'crosshair' }).__getCameraFocusMode = undefined;
    };
  }, [containerId]);

  return viewerRef;
}
