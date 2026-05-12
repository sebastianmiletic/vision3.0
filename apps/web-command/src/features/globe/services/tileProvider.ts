import { Cesium3DTileset } from 'cesium';

import { tileProviderSchema } from '../types/tileProvider';

const GOOGLE_PHOTOREALISTIC_ROOT = 'https://tile.googleapis.com/v1/3dtiles/root.json';

type BuildTilesetArgs = {
  provider: string;
  googleMapsApiKey?: string;
};

function buildGoogleTilesUrl(apiKey: string): string {
  const params = new URLSearchParams({ key: apiKey });
  return `${GOOGLE_PHOTOREALISTIC_ROOT}?${params.toString()}`;
}

export async function createPhotorealisticTileset({ provider, googleMapsApiKey }: BuildTilesetArgs) {
  const selectedProvider = tileProviderSchema.parse(provider);

  if (selectedProvider === 'google') {
    if (!googleMapsApiKey) {
      throw new Error('Missing VITE_GOOGLE_MAPS_API_KEY for Google photorealistic tiles.');
    }

    return Cesium3DTileset.fromUrl(buildGoogleTilesUrl(googleMapsApiKey));
  }

  return Cesium3DTileset.fromIonAssetId(2275207);
}

export { buildGoogleTilesUrl };
