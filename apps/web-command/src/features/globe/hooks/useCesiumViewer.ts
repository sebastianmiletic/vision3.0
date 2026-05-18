import { useEffect, useRef } from 'react';
import {
  ArcGisMapServerImageryProvider,
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Cesium3DTileset,
  Color,
  EllipsoidTerrainProvider,
  HeadingPitchRange,
  ImageryLayer,
  Ion,
  Matrix4,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer,
} from 'cesium';

import { createPhotorealisticTileset } from '../services/tileProvider';
import type { TileProvider } from '../types/tileProvider';

type PerformancePreset = 'quality' | 'balanced' | 'performance';
type CameraFocusMode = 'mouse' | 'crosshair';
type CardinalDirection = 'north' | 'east' | 'south' | 'west';
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
    enabled: boolean;
    alpha: number;
    brightness: number;
    contrast: number;
  };
  allowPhotorealisticTiles: boolean;
  cssTileFilter: string;
};

const DEFAULT_CENTER = Cartesian3.fromDegrees(0, 0, 25000000);
const DEFAULT_ORIENTATION = {
  heading: 0,
  pitch: CesiumMath.toRadians(-90),
  roll: 0,
};
const QUALITY_TILE_MAX_CAMERA_HEIGHT_METERS = 60_000;
const BALANCED_TILE_MAX_CAMERA_HEIGHT_METERS = 45_000;
const PERFORMANCE_TILE_MAX_CAMERA_HEIGHT_METERS = 30_000;
const TILE_VISIBILITY_HYSTERESIS_METERS = 6_000;
const GROUND_ZOOM_MIN_HEIGHT_METERS = 120;
const GROUND_ZOOM_MAX_HEIGHT_METERS = 120_000;
const GROUND_ZOOM_SENSITIVITY_MIN_FACTOR = 0.18;
const QUALITY_BOOT_TILE_READY_TIMEOUT_MS = 30000;
const LOCATION_TILE_PRELOAD_TIMEOUT_MS = 12000;
const CARDINAL_VIEW_RANGE_MIN_METERS = 700;
const CARDINAL_VIEW_RANGE_MAX_METERS = 5400;
const CARDINAL_VIEW_RANGE_DEFAULT_METERS = 1900;
const CARDINAL_VIEW_DURATION_SECONDS = 1.55;
const CARDINAL_VIEW_PITCH_RADIANS = CesiumMath.toRadians(-19);
const LOCATION_VIEW_DURATION_SECONDS = 2.4;
const LOCATION_VIEW_METERS_PER_DEGREE_LAT = 111_132;
const LOCATION_VIEW_MIN_RANGE_METERS = 620;
const LOCATION_VIEW_MAX_RANGE_METERS = 6200;
const LOCATION_VIEW_PITCH_CANDIDATES_DEG = [-16, -21, -26, -31] as const;
const LOCATION_VIEW_HEADING_CANDIDATES_DEG = [30, 55, 85, 125, 170, 215, 260, 305, 340] as const;
const CARDINAL_VIEW_SEQUENCE: readonly CardinalDirection[] = ['north', 'east', 'south', 'west'];
const CARDINAL_VIEW_HEADINGS_DEGREES: Record<CardinalDirection, number> = {
  north: 0,
  east: 90,
  south: 180,
  west: 270,
};
const EARTH_IMAGERY_URL = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
const EARTH_RELIEF_URL = 'https://services.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer';
const DEFAULT_WORLD_TEXTURE: WorldTexturePreset = 'hyperreal-earth';
const WORLD_TEXTURE_PROFILES: Record<WorldTexturePreset, WorldTextureProfile> = {
  'hyperreal-earth': {
    imagery: {
      brightness: 1.0,
      contrast: 1.03,
      saturation: 1.03,
      gamma: 1.0,
      hue: 0,
    },
    globe: {
      baseColor: '#0b3f67',
      atmosphereHueShift: 0,
      atmosphereSaturationShift: -0.32,
      atmosphereBrightnessShift: -0.06,
    },
    relief: {
      enabled: false,
      alpha: 0,
      brightness: 1,
      contrast: 1,
    },
    allowPhotorealisticTiles: true,
    cssTileFilter: 'contrast(1.04) saturate(1.04) brightness(1)',
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
      enabled: false,
      alpha: 0,
      brightness: 1,
      contrast: 1,
    },
    allowPhotorealisticTiles: true,
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
      enabled: true,
      alpha: 0.14,
      brightness: 0.88,
      contrast: 1.1,
    },
    allowPhotorealisticTiles: true,
    cssTileFilter: 'brightness(0.6) contrast(1.4) saturate(0.3)',
  },
  'geoint-high-contrast': {
    imagery: {
      brightness: 0.98,
      contrast: 1.1,
      saturation: 1.02,
      gamma: 1.0,
      hue: CesiumMath.toRadians(1),
    },
    globe: {
      baseColor: '#103958',
      atmosphereHueShift: 0.01,
      atmosphereSaturationShift: -0.34,
      atmosphereBrightnessShift: -0.08,
    },
    relief: {
      enabled: true,
      alpha: 0.08,
      brightness: 1,
      contrast: 1.04,
    },
    allowPhotorealisticTiles: true,
    cssTileFilter: 'contrast(1.1) saturate(1.02) brightness(0.97)',
  },
  'polar-clarity': {
    imagery: {
      brightness: 1.01,
      contrast: 1.08,
      saturation: 0.9,
      gamma: 1.0,
      hue: CesiumMath.toRadians(1),
    },
    globe: {
      baseColor: '#124062',
      atmosphereHueShift: 0.01,
      atmosphereSaturationShift: -0.28,
      atmosphereBrightnessShift: -0.03,
    },
    relief: {
      enabled: true,
      alpha: 0.06,
      brightness: 1.02,
      contrast: 1.04,
    },
    allowPhotorealisticTiles: true,
    cssTileFilter: 'contrast(1.08) saturate(0.9) brightness(1.01)',
  },
  'infrared-scout': {
    imagery: {
      brightness: 0.95,
      contrast: 1.08,
      saturation: 1.06,
      gamma: 1.0,
      hue: CesiumMath.toRadians(-12),
    },
    globe: {
      baseColor: '#201810',
      atmosphereHueShift: -0.08,
      atmosphereSaturationShift: -0.28,
      atmosphereBrightnessShift: -0.1,
    },
    relief: {
      enabled: true,
      alpha: 0.04,
      brightness: 1,
      contrast: 1.04,
    },
    allowPhotorealisticTiles: true,
    cssTileFilter: 'sepia(0.12) saturate(1.06) hue-rotate(-10deg) contrast(1.08) brightness(0.95)',
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

function resolveAdaptiveZoomFactor(cameraHeight: number) {
  if (!Number.isFinite(cameraHeight)) {
    return 1;
  }

  const clampedHeight = Math.min(
    GROUND_ZOOM_MAX_HEIGHT_METERS,
    Math.max(GROUND_ZOOM_MIN_HEIGHT_METERS, cameraHeight),
  );
  const progress = (clampedHeight - GROUND_ZOOM_MIN_HEIGHT_METERS)
    / (GROUND_ZOOM_MAX_HEIGHT_METERS - GROUND_ZOOM_MIN_HEIGHT_METERS);
  const easedProgress = progress * progress * (3 - (2 * progress));

  return GROUND_ZOOM_SENSITIVITY_MIN_FACTOR
    + ((1 - GROUND_ZOOM_SENSITIVITY_MIN_FACTOR) * easedProgress);
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
  worldTexturePreset: WorldTexturePreset,
  previousVisibility: boolean | null,
  photorealisticAvailable: boolean,
) {
  const profile = WORLD_TEXTURE_PROFILES[worldTexturePreset];
  if (!profile.allowPhotorealisticTiles || !photorealisticAvailable) {
    return false;
  }

  const cameraHeight = getCameraHeightMeters(viewer);
  const threshold = preset === 'quality'
    ? QUALITY_TILE_MAX_CAMERA_HEIGHT_METERS
    : preset === 'balanced'
      ? BALANCED_TILE_MAX_CAMERA_HEIGHT_METERS
      : PERFORMANCE_TILE_MAX_CAMERA_HEIGHT_METERS;
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
    tileset.dynamicScreenSpaceError = false;
    tileset.skipLevelOfDetail = false;
    tileset.foveatedScreenSpaceError = false;
    tileset.progressiveResolutionHeightFraction = 0;
    tileset.preferLeaves = true;
    tileset.preloadFlightDestinations = true;
    tileset.preloadWhenHidden = true;
    tileset.cullRequestsWhileMoving = false;
    tileset.cullRequestsWhileMovingMultiplier = 0;
    tileset.cacheBytes = 900_000_000;
    tileset.maximumCacheOverflowBytes = 500_000_000;
    return;
  }

  if (preset === 'balanced') {
    tileset.maximumScreenSpaceError = 2.1;
    tileset.dynamicScreenSpaceError = false;
    tileset.skipLevelOfDetail = false;
    tileset.foveatedScreenSpaceError = false;
    tileset.progressiveResolutionHeightFraction = 0;
    tileset.preferLeaves = true;
    tileset.preloadFlightDestinations = true;
    tileset.preloadWhenHidden = false;
    tileset.cullRequestsWhileMoving = false;
    tileset.cullRequestsWhileMovingMultiplier = 0;
    tileset.cacheBytes = 700_000_000;
    tileset.maximumCacheOverflowBytes = 450_000_000;
    return;
  }

  tileset.maximumScreenSpaceError = 4.0;
  tileset.dynamicScreenSpaceError = false;
  tileset.skipLevelOfDetail = false;
  tileset.foveatedScreenSpaceError = false;
  tileset.progressiveResolutionHeightFraction = 0;
  tileset.preferLeaves = true;
  tileset.preloadFlightDestinations = true;
  tileset.preloadWhenHidden = false;
  tileset.cullRequestsWhileMoving = false;
  tileset.cullRequestsWhileMovingMultiplier = 0;
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
      let nextCardinalViewIndex = 0;
      let lastSearchedLocation: { label: string; latitude: number; longitude: number } | null = null;
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
      viewer.scene.globe.depthTestAgainstTerrain = false;
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
          earthReliefLayer.show = profile.relief.enabled;
          earthReliefLayer.alpha = profile.relief.enabled ? profile.relief.alpha : 0;
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
              resolvedTileset.dynamicScreenSpaceError = false;
              resolvedTileset.skipLevelOfDetail = false;
              resolvedTileset.foveatedScreenSpaceError = false;
              resolvedTileset.preferLeaves = true;
              resolvedTileset.preloadFlightDestinations = true;
              resolvedTileset.progressiveResolutionHeightFraction = 0;
              resolvedTileset.cullRequestsWhileMoving = false;
              resolvedTileset.cullRequestsWhileMovingMultiplier = 0;
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

      const prepareTilesForLocation = async (latitude: number, longitude: number) => {
        if (!viewer || !mounted || !photorealisticAvailable) {
          return;
        }

        const readyTileset = await ensureTileset();
        const previousTilesetShow = readyTileset.show;
        const previousPreloadWhenHidden = readyTileset.preloadWhenHidden;
        const previousTrackedEntity = viewer.trackedEntity;
        const previousCameraPosition = viewer.camera.positionWC.clone();
        const previousHeading = viewer.camera.heading;
        const previousPitch = viewer.camera.pitch;
        const previousRoll = viewer.camera.roll;

        try {
          readyTileset.preloadWhenHidden = true;
          readyTileset.show = false;
          applyTilesetPerformancePreset(readyTileset, activePreset === 'quality' ? 'quality' : 'balanced');
          if (!viewer.scene.primitives.contains(readyTileset)) {
            viewer.scene.primitives.add(readyTileset);
          }

          const targetSurface = viewer.scene.globe.getHeight(Cartographic.fromDegrees(longitude, latitude)) ?? 0;
          const preloadAltitude = Math.max(targetSurface + 2200, 2200);
          viewer.trackedEntity = undefined;
          viewer.camera.setView({
            destination: Cartesian3.fromDegrees(longitude, latitude, preloadAltitude),
            orientation: {
              heading: CesiumMath.toRadians(35),
              pitch: CesiumMath.toRadians(-22),
              roll: 0,
            },
          });

          viewer.scene.requestRender();
          await new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(() => resolve());
            });
          });
          await waitForTilesFullyLoaded(readyTileset, LOCATION_TILE_PRELOAD_TIMEOUT_MS);
        } catch (error) {
          console.warn('Location tile preload failed; continuing to location navigation.', error);
        } finally {
          readyTileset.preloadWhenHidden = previousPreloadWhenHidden;
          readyTileset.show = previousTilesetShow;
          viewer.camera.setView({
            destination: previousCameraPosition,
            orientation: {
              heading: previousHeading,
              pitch: previousPitch,
              roll: previousRoll,
            },
          });
          viewer.trackedEntity = previousTrackedEntity;
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
            const showTileset = shouldShowTileset(
              viewer,
              activePreset,
              activeWorldTexturePreset,
              lastTilesetVisibility,
              photorealisticAvailable,
            );
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

      const clampLocationViewRange = (value: number) => Math.max(
        LOCATION_VIEW_MIN_RANGE_METERS,
        Math.min(LOCATION_VIEW_MAX_RANGE_METERS, value),
      );

      const estimateLocalReliefMeters = (latitude: number, longitude: number) => {
        if (!viewer) {
          return 0;
        }

        const globe = viewer.scene.globe;
        const latRadians = CesiumMath.toRadians(latitude);
        const metersPerDegreeLon = Math.max(10_000, Math.cos(latRadians) * 111_320);
        const sampleRingsMeters = [180, 360];
        const heights: number[] = [];
        const centerHeight = globe.getHeight(Cartographic.fromDegrees(longitude, latitude));
        if (Number.isFinite(centerHeight)) {
          heights.push(centerHeight as number);
        }

        sampleRingsMeters.forEach((radiusMeters) => {
          for (let step = 0; step < 8; step += 1) {
            const heading = CesiumMath.toRadians(step * 45);
            const northMeters = Math.cos(heading) * radiusMeters;
            const eastMeters = Math.sin(heading) * radiusMeters;
            const sampleLat = latitude + (northMeters / LOCATION_VIEW_METERS_PER_DEGREE_LAT);
            const sampleLon = longitude + (eastMeters / metersPerDegreeLon);
            const sampleHeight = globe.getHeight(Cartographic.fromDegrees(sampleLon, sampleLat));
            if (Number.isFinite(sampleHeight)) {
              heights.push(sampleHeight as number);
            }
          }
        });

        if (!heights.length) {
          return 0;
        }

        let min = heights[0] ?? 0;
        let max = heights[0] ?? 0;
        heights.forEach((height) => {
          min = Math.min(min, height);
          max = Math.max(max, height);
        });
        return Math.max(0, max - min);
      };

      const evaluateLocationViewCandidate = (
        targetPosition: Cartesian3,
        headingDeg: number,
        pitchDeg: number,
        rangeMeters: number,
      ) => {
        if (!viewer) {
          return Number.NEGATIVE_INFINITY;
        }

        viewer.camera.lookAt(
          targetPosition,
          new HeadingPitchRange(
            CesiumMath.toRadians(headingDeg),
            CesiumMath.toRadians(pitchDeg),
            rangeMeters,
          ),
        );

        const cameraPosition = viewer.camera.positionWC.clone();
        const targetCanvas = viewer.scene.cartesianToCanvasCoordinates(targetPosition);
        let score = 0;
        if (targetCanvas) {
          const centerX = viewer.scene.canvas.clientWidth * 0.5;
          const centerY = viewer.scene.canvas.clientHeight * 0.5;
          const dx = targetCanvas.x - centerX;
          const dy = targetCanvas.y - centerY;
          const distanceFromCenter = Math.sqrt((dx * dx) + (dy * dy));
          score -= distanceFromCenter * 0.33;
        } else {
          score -= 240;
        }

        const centerRay = viewer.camera.getPickRay(new Cartesian2(
          viewer.scene.canvas.clientWidth * 0.5,
          viewer.scene.canvas.clientHeight * 0.5,
        ));
        if (centerRay) {
          const hit = viewer.scene.pickFromRay(centerRay) as { position?: Cartesian3 } | undefined;
          if (hit?.position) {
            const targetDistance = Cartesian3.distance(cameraPosition, targetPosition);
            const hitDistance = Cartesian3.distance(cameraPosition, hit.position);
            const occlusionGap = Math.abs(targetDistance - hitDistance);
            if (hitDistance < targetDistance * 0.84) {
              score -= 300;
            } else if (occlusionGap > Math.max(40, targetDistance * 0.07)) {
              score -= 130;
            } else {
              score += 130;
            }
          }
        }

        const cameraCartographic = Cartographic.fromCartesian(cameraPosition);
        if (cameraCartographic && Number.isFinite(cameraCartographic.height)) {
          const terrainHeight = viewer.scene.globe.getHeight(cameraCartographic) ?? 0;
          const clearance = cameraCartographic.height - terrainHeight;
          score += Math.max(-180, Math.min(140, clearance * 0.045));
        }

        score -= Math.abs(pitchDeg + 22) * 2.2;
        score -= Math.abs(rangeMeters) * 0.0025;

        const obliqueTargets = [45, 135, 225, 315];
        const obliqueDistance = Math.min(
          ...obliqueTargets.map((base) => {
            const delta = Math.abs((((headingDeg - base) % 360) + 540) % 360 - 180);
            return delta;
          }),
        );
        score += Math.max(0, 42 - obliqueDistance);

        return score;
      };

      const resolveOptimalLocationView = (
        latitude: number,
        longitude: number,
      ) => {
        if (!viewer) {
          return null;
        }

        const targetCartographic = Cartographic.fromDegrees(longitude, latitude);
        const centerHeight = viewer.scene.globe.getHeight(targetCartographic) ?? 0;
        const targetPosition = Cartesian3.fromDegrees(longitude, latitude, Math.max(0, centerHeight + 35));
        const relief = estimateLocalReliefMeters(latitude, longitude);
        const baseRange = clampLocationViewRange(760 + (relief * 7.5));
        const candidateRanges = [
          baseRange * 0.72,
          baseRange * 0.92,
          baseRange * 1.12,
          baseRange * 1.36,
        ].map((range) => clampLocationViewRange(range));

        const previousTrackedEntity = viewer.trackedEntity;
        const previousCameraPosition = viewer.camera.positionWC.clone();
        const previousHeading = viewer.camera.heading;
        const previousPitch = viewer.camera.pitch;
        const previousRoll = viewer.camera.roll;

        let best:
          | {
            headingDegrees: number;
            pitchDegrees: number;
            rangeMeters: number;
            score: number;
          }
          | null = null;

        LOCATION_VIEW_HEADING_CANDIDATES_DEG.forEach((headingDegrees) => {
          LOCATION_VIEW_PITCH_CANDIDATES_DEG.forEach((pitchDegrees) => {
            candidateRanges.forEach((rangeMeters) => {
              const score = evaluateLocationViewCandidate(targetPosition, headingDegrees, pitchDegrees, rangeMeters);
              if (!best || score > best.score) {
                best = {
                  headingDegrees,
                  pitchDegrees,
                  rangeMeters,
                  score,
                };
              }
            });
          });
        });

        viewer.camera.lookAtTransform(Matrix4.IDENTITY);
        viewer.camera.setView({
          destination: previousCameraPosition,
          orientation: {
            heading: previousHeading,
            pitch: previousPitch,
            roll: previousRoll,
          },
        });
        viewer.trackedEntity = previousTrackedEntity;

        if (!best) {
          return null;
        }

        return {
          targetPosition,
          headingDegrees: best.headingDegrees,
          pitchDegrees: best.pitchDegrees,
          rangeMeters: best.rangeMeters,
        };
      };

      const flyToOptimalLocationView = (latitude: number, longitude: number, label?: string) => {
        if (!viewer) {
          return null;
        }

        const optimal = resolveOptimalLocationView(latitude, longitude);
        if (!optimal) {
          return null;
        }

        viewer.trackedEntity = undefined;
        viewer.camera.flyToBoundingSphere(new BoundingSphere(optimal.targetPosition, 1), {
          duration: LOCATION_VIEW_DURATION_SECONDS,
          offset: new HeadingPitchRange(
            CesiumMath.toRadians(optimal.headingDegrees),
            CesiumMath.toRadians(optimal.pitchDegrees),
            optimal.rangeMeters,
          ),
          complete: () => {
            if (!viewer) {
              return;
            }
            viewer.camera.setView({
              orientation: {
                heading: viewer.camera.heading,
                pitch: viewer.camera.pitch,
                roll: 0,
              },
            });
            viewer.scene.requestRender();
          },
          cancel: () => {
            if (!viewer) {
              return;
            }
            viewer.camera.setView({
              orientation: {
                heading: viewer.camera.heading,
                pitch: viewer.camera.pitch,
                roll: 0,
              },
            });
          },
        });
        viewer.scene.requestRender();

        return {
          headingDegrees: optimal.headingDegrees,
          pitchDegrees: optimal.pitchDegrees,
          rangeMeters: optimal.rangeMeters,
          targetLabel: label ?? 'location target',
        };
      };

      const resolveCardinalTargetFromTrackedEntity = () => {
        if (!viewer?.trackedEntity) {
          return null;
        }

        const now = viewer.clock.currentTime;
        const trackedPosition = viewer.trackedEntity.position?.getValue?.(now);
        if (!trackedPosition) {
          return null;
        }

        const trackedLabel = viewer.trackedEntity.name || String(viewer.trackedEntity.id || 'tracked target');
        return { position: trackedPosition, label: trackedLabel };
      };

      const resolveCardinalTargetFromSearch = () => {
        if (!viewer || !lastSearchedLocation) {
          return null;
        }

        const { latitude, longitude, label } = lastSearchedLocation;
        const cartographic = Cartographic.fromDegrees(longitude, latitude);
        const terrainHeight = viewer.scene.globe.getHeight(cartographic) ?? 0;
        const position = Cartesian3.fromDegrees(longitude, latitude, Math.max(0, terrainHeight));
        return { position, label };
      };

      const resolveCardinalTargetFromCrosshair = () => {
        if (!viewer) {
          return null;
        }

        const canvas = viewer.scene.canvas;
        const center = new Cartesian2(canvas.clientWidth * 0.5, canvas.clientHeight * 0.5);
        const ray = viewer.camera.getPickRay(center);
        const picked = ray ? viewer.scene.globe.pick(ray, viewer.scene) : null;
        if (!picked) {
          return null;
        }

        return { position: picked, label: 'crosshair target' };
      };

      const resolveCardinalViewTarget = () => {
        return resolveCardinalTargetFromTrackedEntity()
          ?? resolveCardinalTargetFromSearch()
          ?? resolveCardinalTargetFromCrosshair();
      };

      const resolveCardinalViewRange = (targetPosition: Cartesian3) => {
        const cartographic = Cartographic.fromCartesian(targetPosition);
        if (!cartographic || !Number.isFinite(cartographic.height)) {
          return CARDINAL_VIEW_RANGE_DEFAULT_METERS;
        }

        const scaledRange = Math.abs(cartographic.height) * 1.7;
        return Math.max(
          CARDINAL_VIEW_RANGE_MIN_METERS,
          Math.min(CARDINAL_VIEW_RANGE_MAX_METERS, scaledRange || CARDINAL_VIEW_RANGE_DEFAULT_METERS),
        );
      };

      const cycleCardinalView = () => {
        if (!viewer) {
          return null;
        }

        const target = resolveCardinalViewTarget();
        if (!target) {
          return null;
        }

        const direction = CARDINAL_VIEW_SEQUENCE[nextCardinalViewIndex] ?? 'north';
        nextCardinalViewIndex = (nextCardinalViewIndex + 1) % CARDINAL_VIEW_SEQUENCE.length;
        const headingRadians = CesiumMath.toRadians(CARDINAL_VIEW_HEADINGS_DEGREES[direction]);
        const range = resolveCardinalViewRange(target.position);
        viewer.trackedEntity = undefined;
        viewer.camera.flyToBoundingSphere(new BoundingSphere(target.position, 1), {
          duration: CARDINAL_VIEW_DURATION_SECONDS,
          offset: new HeadingPitchRange(
            headingRadians,
            CARDINAL_VIEW_PITCH_RADIANS,
            range,
          ),
          complete: () => {
            if (!viewer) {
              return;
            }
            viewer.camera.setView({
              orientation: {
                heading: viewer.camera.heading,
                pitch: viewer.camera.pitch,
                roll: 0,
              },
            });
          },
        });
        viewer.scene.requestRender();

        return {
          direction,
          nextDirection: CARDINAL_VIEW_SEQUENCE[nextCardinalViewIndex] ?? 'north',
          targetLabel: target.label,
        };
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
        void syncTilesetVisibility();
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
        const zoomFactor = resolveAdaptiveZoomFactor(getCameraHeightMeters(viewer));
        const zoomScale = (tracked ? 150 : 95) * zoomFactor;
        const minZoom = Math.max(35, (tracked ? 220 : 420) * zoomFactor);
        const maxZoom = Math.max(minZoom, (tracked ? 12000 : 32000) * Math.max(0.45, zoomFactor));
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

      const onLocationSearchResolved = (event: Event) => {
        const detail = (event as CustomEvent<{ label: string; latitude: number; longitude: number }>).detail;
        if (
          detail
          && typeof detail.label === 'string'
          && Number.isFinite(detail.latitude)
          && Number.isFinite(detail.longitude)
        ) {
          lastSearchedLocation = {
            label: detail.label,
            latitude: detail.latitude,
            longitude: detail.longitude,
          };
        }
        nextCardinalViewIndex = 0;
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
        void syncTilesetVisibility();
      };
      window.__prepareTilesForLocation = async (latitude: number, longitude: number) => {
        await prepareTilesForLocation(latitude, longitude);
      };
      window.__flyToOptimalLocationView = (latitude: number, longitude: number, label?: string) => (
        flyToOptimalLocationView(latitude, longitude, label)
      );
      window.__cycleCardinalView = () => cycleCardinalView();
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
      window.__prepareTilesForLocation = undefined;
      window.__flyToOptimalLocationView = undefined;
      window.__cycleCardinalView = undefined;
      (window as Window & { __setCameraFocusMode?: (mode: 'mouse' | 'crosshair') => void }).__setCameraFocusMode = undefined;
      (window as Window & { __getCameraFocusMode?: () => 'mouse' | 'crosshair' }).__getCameraFocusMode = undefined;
    };
  }, [containerId]);

  return viewerRef;
}
