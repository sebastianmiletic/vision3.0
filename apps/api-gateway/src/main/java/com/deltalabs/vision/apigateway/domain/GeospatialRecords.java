package com.deltalabs.vision.apigateway.domain;

import java.time.Instant;

public final class GeospatialRecords {
  private GeospatialRecords() {
  }

  public record FlightTrack(String id, String callsign, double latitude, double longitude, double altitudeMeters,
                            double speedKnots, double headingDegrees, Instant sourceTimestamp) {
  }

  public record EarthquakeEvent(String id, double magnitude, double depthKm, double latitude, double longitude,
                                String place, Instant sourceTimestamp) {
  }

  public record SatelliteState(String id, int noradId, String name, double latitude, double longitude,
                               double altitudeKm, double velocityKps, Instant sourceTimestamp,
                               Double inclinationDeg, Double rightAscensionDeg, Double argumentPerigeeDeg,
                               Double meanAnomalyDeg, Double meanMotionRevPerDay, Instant orbitalEpoch) {
  }

  public record RadarFrame(String id, Instant timestamp, String tilePath, int colorScheme, String source) {
  }

  public record MarketQuote(String symbol, double price, double changePercent, String currency, Instant sourceTimestamp) {
  }
}
