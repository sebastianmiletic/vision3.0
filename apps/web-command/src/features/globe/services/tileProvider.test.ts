import { describe, expect, it } from 'vitest';

import { buildGoogleTilesUrl, createPhotorealisticTileset } from './tileProvider';

describe('buildGoogleTilesUrl', () => {
  it('appends key query parameter', () => {
    const url = buildGoogleTilesUrl('test-key');

    expect(url).toContain('key=test-key');
    expect(url.startsWith('https://tile.googleapis.com/v1/3dtiles/root.json?')).toBe(true);
  });
});

describe('createPhotorealisticTileset', () => {
  it('rejects imagery-only provider mode', async () => {
    await expect(createPhotorealisticTileset({ provider: 'imagery-only' })).rejects.toThrow(
      'Photorealistic tiles are disabled because VITE_TILE_PROVIDER is set to imagery-only.',
    );
  });

  it('rejects google provider when api key is missing', async () => {
    await expect(createPhotorealisticTileset({ provider: 'google' })).rejects.toThrow(
      'Missing VITE_GOOGLE_MAPS_API_KEY for Google photorealistic tiles.',
    );
  });
});
