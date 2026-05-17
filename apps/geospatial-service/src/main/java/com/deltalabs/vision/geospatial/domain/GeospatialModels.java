package com.deltalabs.vision.geospatial.domain;

import java.time.Instant;
import java.util.List;

public final class GeospatialModels {
  private GeospatialModels() {
  }

  public record FlightTrack(String id, String callsign, double latitude, double longitude, double altitudeMeters,
                            double speedKnots, double headingDegrees, Instant sourceTimestamp) {
  }

  public record EarthquakeEvent(String id, double magnitude, double depthKm, double latitude, double longitude,
                                String place, Instant sourceTimestamp) {
  }

  public record SatelliteState(String id, int noradId, String name, double latitude, double longitude,
                               double altitudeKm, double velocityKps, Instant sourceTimestamp) {
  }

  public record RadarFrame(String id, Instant timestamp, String tilePath, int colorScheme, String source) {
  }

  public record Snapshot(List<FlightTrack> flights, List<FlightTrack> militaryFlights,
                         List<EarthquakeEvent> earthquakes, List<SatelliteState> satellites,
                         List<RadarFrame> radarFrames, Instant timestamp) {
  }
}
