import type { FlightTrack } from '@vision/shared-types';

export type FlightsState = {
  items: FlightTrack[];
  lastUpdated?: string;
};
