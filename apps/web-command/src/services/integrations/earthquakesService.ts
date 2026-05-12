import { getJson } from '../apiClient';

import type { EarthquakeEvent } from '@vision/shared-types';

export function fetchEarthquakes(): Promise<EarthquakeEvent[]> {
  return getJson<EarthquakeEvent[]>('/api/v1/geospatial/earthquakes');
}
