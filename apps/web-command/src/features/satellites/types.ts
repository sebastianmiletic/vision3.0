import type { SatelliteState } from '@vision/shared-types';

export type SatellitesState = {
  items: SatelliteState[];
  lastUpdated?: string;
};
