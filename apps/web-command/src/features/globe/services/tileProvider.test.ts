import { describe, expect, it } from 'vitest';

import { buildGoogleTilesUrl } from './tileProvider';

describe('buildGoogleTilesUrl', () => {
  it('appends key query parameter', () => {
    const url = buildGoogleTilesUrl('test-key');

    expect(url).toContain('key=test-key');
    expect(url.startsWith('https://tile.googleapis.com/v1/3dtiles/root.json?')).toBe(true);
  });
});
