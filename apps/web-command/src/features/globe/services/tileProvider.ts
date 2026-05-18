import { Cesium3DTileset } from 'cesium';

import { tileProviderSchema } from '../types/tileProvider';

const GOOGLE_PHOTOREALISTIC_ROOT = 'https://tile.googleapis.com/v1/3dtiles/root.json';
const GOOGLE_ROOT_WARMUP_TIMEOUT_MS = 4500;

type BuildTilesetArgs = {
  provider: string;
  googleMapsApiKey?: string;
};

function buildGoogleTilesUrl(apiKey: string): string {
  const params = new URLSearchParams({ key: apiKey });
  return `${GOOGLE_PHOTOREALISTIC_ROOT}?${params.toString()}`;
}

function buildTilesetRuntimeOptions() {
  return {
    // Load visible coarse tiles quickly, then refine while moving.
    preferLeaves: true,
    preloadFlightDestinations: true,
    preloadWhenHidden: false,
    progressiveResolutionHeightFraction: 0.25,
    cullRequestsWhileMoving: true,
    cullRequestsWhileMovingMultiplier: 80,
    dynamicScreenSpaceError: true,
    dynamicScreenSpaceErrorFactor: 18,
    dynamicScreenSpaceErrorDensity: 0.0025,
    skipLevelOfDetail: true,
    foveatedScreenSpaceError: true,
    foveatedConeSize: 0.35,
  };
}

export async function prewarmGooglePhotorealisticTiles(googleMapsApiKey?: string): Promise<void> {
  if (!googleMapsApiKey || typeof window === 'undefined') {
    return;
  }

  const url = buildGoogleTilesUrl(googleMapsApiKey);
  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => abortController.abort(), GOOGLE_ROOT_WARMUP_TIMEOUT_MS);

  try {
    await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'force-cache',
      signal: abortController.signal,
    });

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'vision:precache-3d-root',
        url,
      });
    }
  } catch {
    // Warmup is best-effort only; viewer init continues regardless.
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function createPhotorealisticTileset({ provider, googleMapsApiKey }: BuildTilesetArgs) {
  const selectedProvider = tileProviderSchema.parse(provider);

  if (selectedProvider === 'imagery-only') {
    throw new Error('Photorealistic tiles are disabled because VITE_TILE_PROVIDER is set to imagery-only.');
  }

  if (selectedProvider === 'google') {
    if (!googleMapsApiKey) {
      throw new Error('Missing VITE_GOOGLE_MAPS_API_KEY for Google photorealistic tiles.');
    }

    return Cesium3DTileset.fromUrl(buildGoogleTilesUrl(googleMapsApiKey), buildTilesetRuntimeOptions());
  }

  return Cesium3DTileset.fromIonAssetId(2275207, buildTilesetRuntimeOptions());
}

export { buildGoogleTilesUrl };
