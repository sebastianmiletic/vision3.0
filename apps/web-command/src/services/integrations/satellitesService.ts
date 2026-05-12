import { getJson } from '../apiClient';

import type { SatelliteState } from '@vision/shared-types';

export function fetchSatellites(): Promise<SatelliteState[]> {
  return getJson<SatelliteState[]>('/api/v1/geospatial/satellites');
}
