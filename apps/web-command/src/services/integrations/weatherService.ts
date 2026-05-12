import { getJson } from '../apiClient';

import type { RadarFrame } from '@vision/shared-types';

export function fetchRadarFrames(): Promise<RadarFrame[]> {
  return getJson<RadarFrame[]>('/api/v1/geospatial/weather/radar-frames');
}
