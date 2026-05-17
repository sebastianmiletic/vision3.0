import { z } from 'zod';

export const flightTrackSchema = z.object({
  id: z.string(),
  callsign: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  altitudeMeters: z.number(),
  speedKnots: z.number(),
  headingDegrees: z.number(),
  sourceTimestamp: z.string(),
});

export const earthquakeEventSchema = z.object({
  id: z.string(),
  magnitude: z.number(),
  depthKm: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  place: z.string(),
  sourceTimestamp: z.string(),
});

export const satelliteStateSchema = z.object({
  id: z.string(),
  noradId: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  altitudeKm: z.number(),
  velocityKps: z.number(),
  sourceTimestamp: z.string(),
});

export const radarFrameSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  tilePath: z.string(),
  colorScheme: z.number(),
  source: z.literal('rainviewer'),
});

export const marketQuoteSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  changePercent: z.number(),
  currency: z.string(),
  sourceTimestamp: z.string(),
});

export const layerToggleStateSchema = z.record(z.string(), z.boolean());

export const themeConfigSchema = z.object({
  accent: z.enum(['cyan', 'orange', 'gold', 'lime', 'cobalt', 'teal', 'rose', 'crimson']),
  panelOpacity: z.number().min(0).max(1),
  mode: z.enum(['normal', 'crt', 'nvg', 'noir', 'spotlight', 'ultra']),
});

export type FlightTrack = z.infer<typeof flightTrackSchema>;
export type EarthquakeEvent = z.infer<typeof earthquakeEventSchema>;
export type SatelliteState = z.infer<typeof satelliteStateSchema>;
export type RadarFrame = z.infer<typeof radarFrameSchema>;
export type MarketQuote = z.infer<typeof marketQuoteSchema>;
export type LayerToggleState = z.infer<typeof layerToggleStateSchema>;
export type ThemeConfig = z.infer<typeof themeConfigSchema>;

export const geospatialSnapshotSchema = z.object({
  flights: z.array(flightTrackSchema),
  militaryFlights: z.array(flightTrackSchema),
  earthquakes: z.array(earthquakeEventSchema),
  satellites: z.array(satelliteStateSchema),
  radarFrames: z.array(radarFrameSchema),
  timestamp: z.string(),
});

export type GeospatialSnapshot = z.infer<typeof geospatialSnapshotSchema>;
