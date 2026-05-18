import { getJson } from '../apiClient';

import type { SatelliteState } from '@vision/shared-types';

export function fetchSatellites(advanced = false): Promise<SatelliteState[]> {
  return getJson<SatelliteState[]>(`/api/v1/geospatial/satellites${advanced ? '?advanced=true' : ''}`);
}
