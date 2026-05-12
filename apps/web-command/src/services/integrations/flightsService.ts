import { getJson } from '../apiClient';

import type { FlightTrack } from '@vision/shared-types';

export function fetchFlights(): Promise<FlightTrack[]> {
  return getJson<FlightTrack[]>('/api/v1/geospatial/flights');
}
