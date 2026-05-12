import type { RadarFrame } from '@vision/shared-types';

export type WeatherState = {
  frames: RadarFrame[];
  lastUpdated?: string;
};
