import type { EarthquakeEvent } from '@vision/shared-types';

export type EarthquakesState = {
  items: EarthquakeEvent[];
  lastUpdated?: string;
};
