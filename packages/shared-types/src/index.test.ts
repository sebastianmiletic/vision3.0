import { describe, expect, it } from 'vitest';

import { flightTrackSchema } from './index';

describe('shared-types schemas', () => {
  it('validates flight track payload', () => {
    const parsed = flightTrackSchema.parse({
      id: 'abc',
      callsign: 'DAL123',
      latitude: 38.9,
      longitude: -77.0,
      altitudeMeters: 5500,
      speedKnots: 320,
      headingDegrees: 110,
      sourceTimestamp: new Date().toISOString(),
    });

    expect(parsed.callsign).toBe('DAL123');
  });
});
