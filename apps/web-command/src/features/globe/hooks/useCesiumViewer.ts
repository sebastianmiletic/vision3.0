import { useEffect, useRef } from 'react';
import {
  ArcGisMapServerImageryProvider,
  Cartesian3,
  Cartographic,
  Cesium3DTileset,
  Color,
  EllipsoidTerrainProvider,
  ImageryLayer,
  Ion,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer,
} from 'cesium';

import { createPhotorealisticTileset } from '../services/tileProvider';
import type { TileProvider } from '../types/tileProvider';

type PerformancePreset = 'quality' | 'balanced' | 'performance';
type CameraFocusMode = 'mouse' | 'crosshair';
type WorldTexturePreset = 'hyperreal-earth' | 'true-color' | 'space-night' | 'geoint-high-contrast' | 'polar-clarity' | 'infrared-scout';
type WorldTextureProfile = {
  imagery: {
    brightness: number;
    contrast: number;
    saturation: number;
    gamma: number;
    hue: number;
  };
  globe: {
    baseColor: string;
    atmosphereHueShift: number;
    atmosphereSaturationShift: number;
    atmosphereBrightnessShift: number;
  };
  relief: {
    alpha: number;
    brightness: number;
    contrast: number;
  };
  cssTileFilter: string;
};

const DEFAULT_CENTER = Cartesian3.fromDegrees(0, 0, 25000000);
const DEFAULT_ORIENTATION = {
  heading: 0,
  pitch: CesiumMath.toRadians(-90),
  roll: 0,
};
const QUALITY_TILE_MAX_CAMERA_HEIGHT_METERS = 2_600_000;
const BALANCED_TILE_MAX_CAMERA_HEIGHT_METERS = 1_900_000;
const TILE_VISIBILITY_HYSTERESIS_METERS = 180_000;
const QUALITY_BOOT_TILE_READY_TIMEOUT_MS = 30000;
const EARTH_IMAGERY_URL = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
const EARTH_RELIEF_URL = 'https://services.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer';
const DEFAULT_WORLD_TEXTURE: WorldTexturePreset = 'hyperreal-earth';
const WORLD_TEXTURE_PROFILES: Record<WorldTexturePreset, WorldTextureProfile> = {
  'hyperreal-earth': {
    imagery: {
      brightness: 1.03,
      contrast: 1.12,
      saturation: 1.1,
      gamma: 0.98,
      hue: 0,
    },
    globe: {
      baseColor: '#0f3f63',
      atmosphereHueShift: 0.01,
      atmosphereSaturationShift: -0.28,
      atmosphereBrightnessShift: -0.02,
    },
    relief: {
      alpha: 0.34,
      brightness: 1.06,
      contrast: 1.15,
    },
    cssTileFilter: 'contrast(1.08) saturate(1.12) brightness(1.02)',
  },
  'true-color': {
    imagery: {
      brightness: 1.0,
      contrast: 1.0,
      saturation: 1.0,
      gamma: 1.0,
      hue: 0,
    },
    globe: {
      baseColor: '#0b3c66',
      atmosphereHueShift: 0,
      atmosphereSaturationShift: -0.35,
      atmosphereBrightnessShift: -0.08,
    },
    relief: {
      alpha: 0.24,
      brightness: 1.02,
      contrast: 1.06,
    },
    cssTileFilter: 'none',
  },
  'space-night': {
    imagery: {
      brightness: 0.52,
      contrast: 1.45,
      saturation: 0.24,
      gamma: 1.08,
      hue: CesiumMath.toRadians(-8),
    },
    globe: {
      baseColor: '#020915',
      atmosphereHueShift: -0.1,
      atmosphereSaturationShift: -0.62,
      atmosphereBrightnessShift: -0.24,
    },
    relief: {
      alpha: 0.14,
      brightness: 0.88,
      contrast: 1.1,
    },
    cssTileFilter: 'brightness(0.6) contrast(1.4) saturate(0.3)',
  },
  'geoint-high-contrast': {
    imagery: {
      brightness: 1.02,
      contrast: 1.2,
      saturation: 0.9,
      gamma: 0.98,
      hue: CesiumMath.toRadians(4),
    },
    globe: {
      baseColor: '#10304c',
      atmosphereHueShift: 0.02,
      atmosphereSaturationShift: -0.3,
      atmosphereBrightnessShift: -0.04,
    },
    relief: {
      alpha: 0.26,
      brightness: 1.05,
      contrast: 1.12,
    },
    cssTileFilter: 'contrast(1.18) saturate(0.92) brightness(1.01)',
  },
  'polar-clarity': {
    imagery: {
      brightness: 1.07,
      contrast: 1.06,
      saturation: 0.82,
      gamma: 1.01,
      hue: CesiumMath.toRadians(2),
    },
    globe: {
      baseColor: '#123a5a',
      atmosphereHueShift: 0.03,
      atmosphereSaturationShift: -0.24,
      atmosphereBrightnessShift: 0,
    },
    relief: {
      alpha: 0.28,
      brightness: 1.08,
      contrast: 1.08,
    },
    cssTileFilter: 'saturate(0.82) brightness(1.08) contrast(1.06)',
  },
  'infrared-scout': {
    imagery: {
      brightness: 0.96,
      contrast: 1.2,
      saturation: 1.28,
      gamma: 1.02,
      hue: CesiumMath.toRadians(-24),
    },
    globe: {
      baseColor: '#2a1b0f',
      atmosphereHueShift: -0.15,
      atmosphereSaturationShift: -0.2,
      atmosphereBrightnessShift: -0.12,
    },
    relief: {
      alpha: 0.2,
      brightness: 0.98,
      contrast: 1.14,
    },
    cssTileFilter: 'sepia(0.3) saturate(1.2) hue-rotate(-20deg) contrast(1.16) brightness(0.98)',
  },
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

function normalizeWorldTexturePreset(value: string | undefined): WorldTexturePreset {
  if (value === 'hyperreal-earth'
    || value === 'space-night'
    || value === 'geoint-high-contrast'
    || value === 'polar-clarity'
    || value === 'infrared-scout'
    || value === 'true-color') {
    return value;
  }

  return DEFAULT_WORLD_TEXTURE;
}

function getCameraHeightMeters(viewer: Viewer) {
  const cartographic = Cartographic.fromCartesian(viewer.camera.positionWC);
  return Number.isFinite(cartographic.height) ? cartographic.height : Number.POSITIVE_INFINITY;
}

function resolveTileProvider(): TileProvider {
  const configured = import.meta.env.VITE_TILE_PROVIDER ?? 'google';
  const hasGoogleKey = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  const hasIonToken = Boolean(import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN);

  if (configured === 'google') {
    if (hasGoogleKey) {
      return 'google';
    }
    return hasIonToken ? 'cesium-ion' : 'imagery-only';
  }

  if (configured === 'cesium-ion') {
    if (hasIonToken) {
      return 'cesium-ion';
    }
    return hasGoogleKey ? 'google' : 'imagery-only';
  }

  return 'imagery-only';
}

function shouldShowTileset(
  viewer: Viewer,
  preset: PerformancePreset,
  previousVisibility: boolean | null,
  photorealisticAvailable: boolean,
) {
  if (!photorealisticAvailable || preset === 'performance') {
    return false;
  }

  const cameraHeight = getCameraHeightMeters(viewer);
  const threshold = preset === 'quality' ? QUALITY_TILE_MAX_CAMERA_HEIGHT_METERS : BALANCED_TILE_MAX_CAMERA_HEIGHT_METERS;
  const thresholdWithBuffer = previousVisibility == null
    ? threshold
    : previousVisibility
      ? threshold + TILE_VISIBILITY_HYSTERESIS_METERS
      : threshold - TILE_VISIBILITY_HYSTERESIS_METERS;

  return cameraHeight <= thresholdWithBuffer;
}

function applyViewerPerformancePreset(viewer: Viewer, preset: PerformancePreset) {
  const dpr = window.devicePixelRatio || 1;
  const scene = viewer.scene;
  const fxaaStage = scene.postProcessStages.fxaa;

  if (preset === 'quality') {
    viewer.targetFrameRate = 60;
    viewer.resolutionScale = Math.min(1.2, Math.max(1, dpr));
    fxaaStage.enabled = true;
    scene.globe.maximumScreenSpaceError = 1.15;
    scene.requestRender();
    return;
  }

  if (preset === 'balanced') {
    viewer.targetFrameRate = 42;
    viewer.resolutionScale = Math.min(1, Math.max(0.85, dpr * 0.8));
    fxaaStage.enabled = true;
    scene.globe.maximumScreenSpaceError = 1.8;
    scene.requestRender();
    return;
  }

  viewer.targetFrameRate = 30;
  viewer.resolutionScale = 0.7;
  fxaaStage.enabled = false;
  scene.globe.maximumScreenSpaceError = 3.2;
  scene.requestRender();
}

function applyTilesetPerformancePreset(tileset: Cesium3DTileset, preset: PerformancePreset) {
  if (preset === 'quality') {
    tileset.maximumScreenSpaceError = 0.95;
    tileset.dynamicScreenSpaceError = true;
    tileset.skipLevelOfDetail = true;
    tileset.foveatedScreenSpaceError = true;
    tileset.progressiveResolutionHeightFraction = 0.45;
    tileset.preferLeaves = true;
    tileset.preloadFlightDestinations = true;
    tileset.preloadWhenHidden = true;
    tileset.cullRequestsWhileMoving = true;
    tileset.cullRequestsWhileMovingMultiplier = 40;
    tileset.cacheBytes = 900_000_000;
    tileset.maximumCacheOverflowBytes = 500_000_000;
    return;
  }

  if (preset === 'balanced') {
    tileset.maximumScreenSpaceError = 2.1;
    tileset.dynamicScreenSpaceError = true;
    tileset.skipLevelOfDetail = true;
    tileset.foveatedScreenSpaceError = true;
    tileset.progressiveResolutionHeightFraction = 0.25;
    tileset.preferLeaves = true;
    tileset.preloadFlightDestinations = true;
    tileset.preloadWhenHidden = false;
    tileset.cullRequestsWhileMoving = true;
    tileset.cullRequestsWhileMovingMultiplier = 80;
    tileset.cacheBytes = 700_000_000;
    tileset.maximumCacheOverflowBytes = 450_000_000;
    return;
  }

  tileset.maximumScreenSpaceError = 4.0;
  tileset.dynamicScreenSpaceError = true;
  tileset.skipLevelOfDetail = true;
  tileset.foveatedScreenSpaceError = true;
  tileset.progressiveResolutionHeightFraction = 0.25;
  tileset.preferLeaves = true;
  tileset.preloadFlightDestinations = true;
  tileset.preloadWhenHidden = false;
  tileset.cullRequestsWhileMoving = true;
  tileset.cullRequestsWhileMovingMultiplier = 80;
  tileset.cacheBytes = 450_000_000;
  tileset.maximumCacheOverflowBytes = 250_000_000;
}

export function useCesiumViewer(containerId: string) {
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    let mounted = true;
    let handler: ScreenSpaceEventHandler | null = null;
    let viewer: Viewer | null = null;
    let removeCameraChangedListener: (() => void) | null = null;
    let removeLocationSearchListener: (() => void) | null = null;
    let cameraFocusMode: CameraFocusMode = 'crosshair';
    let globeReadyEmitted = false;
    const provider = resolveTileProvider();
    window.__visionGlobeReady = false;

    const emitGlobeReady = () => {
      if (globeReadyEmitted) {
        return;
      }
      globeReadyEmitted = true;
      window.__visionGlobeReady = true;
      window.dispatchEvent(new CustomEvent('vision:globe-ready'));
    };

    if (import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN) {
      Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN;
    }

    async function start() {
      const flatTerrainProvider = new EllipsoidTerrainProvider();
      let tileset: Cesium3DTileset | null = null;
      let tilesetPromise: Promise<Cesium3DTileset> | null = null;
      let earthImageryLayer: ImageryLayer | null = null;
      let earthReliefLayer: ImageryLayer | null = null;
      let earthImageryLayerPromise: Promise<ImageryLayer | null> | null = null;
      let activePreset: PerformancePreset = 'balanced';
      let activeWorldTexturePreset: WorldTexturePreset = DEFAULT_WORLD_TEXTURE;
      let syncingTilesetVisibility = false;
      let pendingTilesetSync = false;
      let lastTilesetVisibility: boolean | null = null;
      let qualityTilesPreloading = false;
      let photorealisticAvailable = provider !== 'imagery-only';
      const initialPresetFromDom = normalizePreset(
        document
          .querySelector<HTMLButtonElement>('.mini-preset-btn[data-performance-preset].active')
          ?.getAttribute('data-performance-preset') ?? undefined,
      );

      if (!photorealisticAvailable) {
        console.warn('Photorealistic tiles disabled; running imagery-only Earth mode for smooth global rendering.');
      }

      const waitForTilesFullyLoaded = (readyTileset: Cesium3DTileset, timeoutMs: number) => new Promise<void>((resolve) => {
        let settled = false;
        let consecutiveIdleFrames = 0;
        const finish = () => {
          if (settled) {
            return;
          }
          settled = true;
          window.clearTimeout(timeoutId);
          removeInitialTilesListener();
          removeAllTilesListener();
          removeLoadProgressListener();
          resolve();
        };
        const onLoadProgress = (pendingRequests: number, processingTiles: number) => {
          if (pendingRequests === 0 && processingTiles === 0) {
            consecutiveIdleFrames += 1;
            if (consecutiveIdleFrames >= 3) {
              finish();
            }
            return;
          }

          consecutiveIdleFrames = 0;
        };
        const removeInitialTilesListener = readyTileset.initialTilesLoaded.addEventListener(() => {
          consecutiveIdleFrames = 1;
        });
        const removeAllTilesListener = readyTileset.allTilesLoaded.addEventListener(finish);
        const removeLoadProgressListener = readyTileset.loadProgress.addEventListener(onLoadProgress);
        const timeoutId = window.setTimeout(finish, timeoutMs);
      });

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
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
        msaaSamples: 2,
      });

      if (viewer.scene.skyAtmosphere) {
        viewer.scene.skyAtmosphere.show = true;
      }
      if (viewer.scene.skyBox) {
        viewer.scene.skyBox.show = true;
      }
      if (viewer.scene.sun) {
        viewer.scene.sun.show = false;
      }
      if (viewer.scene.moon) {
        viewer.scene.moon.show = false;
      }
      viewer.scene.sunBloom = false;
      viewer.scene.backgroundColor = Color.fromCssColorString('#020b14');
      viewer.scene.globe.baseColor = Color.fromCssColorString('#0f3f63');
      viewer.scene.globe.depthTestAgainstTerrain = true;
      viewer.scene.globe.enableLighting = false;
      viewer.scene.globe.dynamicAtmosphereLighting = false;
      viewer.scene.globe.dynamicAtmosphereLightingFromSun = false;
      viewer.scene.globe.showGroundAtmosphere = true;
      viewer.scene.globe.atmosphereHueShift = 0;
      viewer.scene.globe.atmosphereSaturationShift = -0.28;
      viewer.scene.globe.atmosphereBrightnessShift = -0.02;
      if (viewer.scene.fog) {
        viewer.scene.fog.enabled = false;
      }

      const applyWorldTexturePreset = (presetValue: string | undefined) => {
        if (!viewer) {
          return;
        }

        activeWorldTexturePreset = normalizeWorldTexturePreset(presetValue);
        const profile = WORLD_TEXTURE_PROFILES[activeWorldTexturePreset];
        if (!profile) {
          return;
        }

        if (earthImageryLayer) {
          earthImageryLayer.brightness = profile.imagery.brightness;
          earthImageryLayer.contrast = profile.imagery.contrast;
          earthImageryLayer.saturation = profile.imagery.saturation;
          earthImageryLayer.gamma = profile.imagery.gamma;
          earthImageryLayer.hue = profile.imagery.hue;
        }
        if (earthReliefLayer) {
          earthReliefLayer.alpha = profile.relief.alpha;
          earthReliefLayer.brightness = profile.relief.brightness;
          earthReliefLayer.contrast = profile.relief.contrast;
          earthReliefLayer.saturation = 0;
          earthReliefLayer.gamma = 1;
          earthReliefLayer.hue = 0;
        }

        viewer.scene.globe.baseColor = Color.fromCssColorString(profile.globe.baseColor);
        viewer.scene.globe.atmosphereHueShift = profile.globe.atmosphereHueShift;
        viewer.scene.globe.atmosphereSaturationShift = profile.globe.atmosphereSaturationShift;
        viewer.scene.globe.atmosphereBrightnessShift = profile.globe.atmosphereBrightnessShift;
        const css3dFilter = profile.cssTileFilter === 'none' ? 'saturate(1) contrast(1) brightness(1)' : profile.cssTileFilter;
        document.documentElement.style.setProperty('--world-tex-filter', css3dFilter);
        document.documentElement.style.setProperty('--google-2d-filter', profile.cssTileFilter);
        viewer.scene.requestRender();
      };

      const ensureEarthImageryLayer = async (): Promise<ImageryLayer | null> => {
        if (!viewer || !mounted) {
          return null;
        }

        if (earthImageryLayer) {
          return earthImageryLayer;
        }

        if (!earthImageryLayerPromise) {
          earthImageryLayerPromise = ArcGisMapServerImageryProvider.fromUrl(EARTH_IMAGERY_URL)
            .then(async (provider) => {
              if (!viewer || !mounted) {
                return null;
              }

              viewer.imageryLayers.removeAll(true);
              earthImageryLayer = viewer.imageryLayers.addImageryProvider(provider, 0);
              earthImageryLayer.alpha = 1;
              earthImageryLayer.show = true;
              earthReliefLayer = null;
              try {
                const hillshadeProvider = await ArcGisMapServerImageryProvider.fromUrl(EARTH_RELIEF_URL);
                if (viewer && mounted) {
                  earthReliefLayer = viewer.imageryLayers.addImageryProvider(hillshadeProvider, 1);
                  earthReliefLayer.show = true;
                }
              } catch (error) {
                console.warn('Failed to load hillshade relief layer; continuing with base imagery only.', error);
              }
              applyWorldTexturePreset(activeWorldTexturePreset);
              return earthImageryLayer;
            })
            .catch((error) => {
              console.warn('Failed to load ArcGIS Earth imagery, keeping default imagery layer.', error);
              return null;
            });
        }

        return earthImageryLayerPromise;
      };

      const ensureTileset = async (): Promise<Cesium3DTileset> => {
        if (!photorealisticAvailable) {
          throw new Error('Photorealistic tileset is disabled in imagery-only mode.');
        }

        if (tileset) {
          return tileset;
        }

        if (!tilesetPromise) {
          tilesetPromise = createPhotorealisticTileset({
            provider,
            googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          })
            .then((resolvedTileset) => {
              resolvedTileset.maximumScreenSpaceError = 1.6;
              resolvedTileset.dynamicScreenSpaceError = true;
              resolvedTileset.skipLevelOfDetail = true;
              resolvedTileset.foveatedScreenSpaceError = true;
              resolvedTileset.preferLeaves = true;
              resolvedTileset.preloadFlightDestinations = true;
              resolvedTileset.progressiveResolutionHeightFraction = 0.25;
              resolvedTileset.cullRequestsWhileMoving = true;
              resolvedTileset.cullRequestsWhileMovingMultiplier = 80;
              tileset = resolvedTileset;
              return resolvedTileset;
            })
            .catch((error) => {
              photorealisticAvailable = false;
              lastTilesetVisibility = false;
              tilesetPromise = null;
              console.warn('Photorealistic tiles unavailable; staying on hyperreal imagery-only Earth mode.', error);
              throw error;
            });
        }

        return tilesetPromise;
      };

      const preloadQualityTilesForBoot = async () => {
        if (!viewer || !mounted || !photorealisticAvailable) {
          return;
        }

        qualityTilesPreloading = true;
        const readyTileset = await ensureTileset();
        applyTilesetPerformancePreset(readyTileset, 'quality');
        if (!viewer.scene.primitives.contains(readyTileset)) {
          viewer.scene.primitives.add(readyTileset);
        }
        readyTileset.show = false;
        viewer.scene.requestRender();
        await waitForTilesFullyLoaded(readyTileset, QUALITY_BOOT_TILE_READY_TIMEOUT_MS);
        qualityTilesPreloading = false;
        if (activePreset === 'quality') {
          readyTileset.show = true;
          viewer.scene.requestRender();
        }
      };

      const syncTilesetVisibility = async () => {
        if (!viewer || !mounted) {
          return;
        }
        if (syncingTilesetVisibility) {
          pendingTilesetSync = true;
          return;
        }

        syncingTilesetVisibility = true;
        try {
          do {
            pendingTilesetSync = false;
            const showTileset = shouldShowTileset(viewer, activePreset, lastTilesetVisibility, photorealisticAvailable);
            if (lastTilesetVisibility === showTileset) {
              continue;
            }

            lastTilesetVisibility = showTileset;
            if (!showTileset) {
              if (tileset) {
                tileset.show = false;
                viewer.scene.requestRender();
              }
              continue;
            }

            try {
              const readyTileset = await ensureTileset();
              if (!viewer || !mounted) {
                break;
              }
              applyTilesetPerformancePreset(readyTileset, activePreset);
              if (!viewer.scene.primitives.contains(readyTileset)) {
                viewer.scene.primitives.add(readyTileset);
              }
              if (activePreset === 'quality' && qualityTilesPreloading) {
                readyTileset.show = false;
                viewer.scene.requestRender();
                continue;
              }
              readyTileset.show = true;
              viewer.scene.requestRender();
            } catch (error) {
              photorealisticAvailable = false;
              lastTilesetVisibility = false;
              if (tileset) {
                tileset.show = false;
              }
              viewer.scene.requestRender();
              console.warn('Photorealistic tiles failed during visibility sync; falling back to imagery-only mode.', error);
            }
          } while (pendingTilesetSync);
        } finally {
          syncingTilesetVisibility = false;
        }
      };

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
        duration: initialPresetFromDom === 'quality' ? 0 : 2.2,
      });

      const onCameraChanged = () => {
        if (!viewer) {
          return;
        }
        viewer.scene.requestRender();
        if (activePreset !== 'performance') {
          void syncTilesetVisibility();
        }
      };
      viewer.camera.percentageChanged = 0.02;
      viewer.camera.changed.addEventListener(onCameraChanged);
      removeCameraChangedListener = () => viewer?.camera.changed.removeEventListener(onCameraChanged);

      handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

      const applyConsistentWheelZoom = (movement: unknown) => {
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

        const tracked = viewer.trackedEntity;
        const zoomScale = tracked ? 150 : 95;
        const minZoom = tracked ? 220 : 420;
        const maxZoom = tracked ? 12000 : 32000;
        const zoomAmount = Math.min(maxZoom, Math.max(minZoom, Math.abs(rawDelta) * zoomScale));

        // Keep a fixed gesture contract everywhere:
        // two-finger swipe down => zoom in, swipe up => zoom out.
        if (rawDelta > 0) {
          viewer.camera.zoomIn(zoomAmount);
        } else {
          viewer.camera.zoomOut(zoomAmount);
        }
      };

      handler.setInputAction(applyConsistentWheelZoom, ScreenSpaceEventType.WHEEL);

      viewerRef.current = viewer;

      const applyCameraFocusMode = (modeValue: string | undefined) => {
        if (!viewer || !handler) {
          return;
        }

        cameraFocusMode = normalizeCameraFocusMode(modeValue);
      };

      const applyPreset = (presetValue: string | undefined) => {
        if (!viewer) {
          return;
        }

        activePreset = normalizePreset(presetValue);
        applyViewerPerformancePreset(viewer, activePreset);
        if (tileset) {
          applyTilesetPerformancePreset(tileset, activePreset);
        }
        if (activePreset === 'quality' && photorealisticAvailable) {
          void preloadQualityTilesForBoot()
            .catch((error) => {
              qualityTilesPreloading = false;
              console.warn('Quality tiles preload failed; continuing with live streaming.', error);
            })
            .finally(() => {
              void syncTilesetVisibility();
            });
          return;
        }
        void syncTilesetVisibility();
      };

      const normalizedInitialPreset = initialPresetFromDom;
      applyPreset(normalizedInitialPreset);
      const activeWorldTexture = document
        .querySelector<HTMLButtonElement>('[data-world-texture].active')
        ?.getAttribute('data-world-texture');
      applyWorldTexturePreset(activeWorldTexture ?? DEFAULT_WORLD_TEXTURE);
      void ensureEarthImageryLayer();
      const activeCameraFocus = document
        .querySelector<HTMLButtonElement>('.focus-mode-btn[data-camera-focus].active')
        ?.getAttribute('data-camera-focus');
      applyCameraFocusMode(activeCameraFocus ?? 'crosshair');

      if (normalizedInitialPreset === 'quality' && photorealisticAvailable) {
        void preloadQualityTilesForBoot()
          .catch((error) => {
            qualityTilesPreloading = false;
            console.warn('Quality tiles boot preload timed out or failed; continuing with live streaming.', error);
          })
          .finally(() => {
            void syncTilesetVisibility();
            emitGlobeReady();
          });
      } else {
        emitGlobeReady();
      }

      const onLocationSearchResolved = () => {
        if (activePreset === 'performance') {
          return;
        }
        window.setTimeout(() => {
          void syncTilesetVisibility();
        }, 180);
      };
      window.addEventListener('vision:location-search-resolved', onLocationSearchResolved);
      removeLocationSearchListener = () => {
        window.removeEventListener('vision:location-search-resolved', onLocationSearchResolved);
      };

      (window as Window & { __recenterEarth?: () => void }).__recenterEarth = () => {
        document.body.classList.remove('map-2d-active', 'focus-data-active');
        flyToDefaultEarthView(1.4);
        window.dispatchEvent(new CustomEvent('vision:camera-reset'));
      };

      (window as Window & { __applyPerformancePreset?: (preset: string) => void }).__applyPerformancePreset = (preset: string) => {
        applyPreset(preset);
      };
      window.__applyWorldTexturePreset = (preset: string) => {
        applyWorldTexturePreset(preset);
      };
      (window as Window & { __setCameraFocusMode?: (mode: 'mouse' | 'crosshair') => void }).__setCameraFocusMode = (mode: 'mouse' | 'crosshair') => {
        applyCameraFocusMode(mode);
      };
      (window as Window & { __getCameraFocusMode?: () => 'mouse' | 'crosshair' }).__getCameraFocusMode = () => cameraFocusMode;
    }

    start().catch((error) => {
      console.error('Failed to initialize Cesium viewer', error);
      emitGlobeReady();
    });

    return () => {
      mounted = false;
      removeCameraChangedListener?.();
      removeLocationSearchListener?.();
      handler?.destroy();
      viewer?.destroy();
      viewerRef.current = null;
      (window as Window & { __recenterEarth?: () => void }).__recenterEarth = undefined;
      (window as Window & { __applyPerformancePreset?: (preset: string) => void }).__applyPerformancePreset = undefined;
      window.__applyWorldTexturePreset = undefined;
      (window as Window & { __setCameraFocusMode?: (mode: 'mouse' | 'crosshair') => void }).__setCameraFocusMode = undefined;
      (window as Window & { __getCameraFocusMode?: () => 'mouse' | 'crosshair' }).__getCameraFocusMode = undefined;
    };
  }, [containerId]);

  return viewerRef;
}
