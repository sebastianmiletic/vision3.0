package com.deltalabs.vision.geospatial.store;

import com.deltalabs.vision.geospatial.domain.GeospatialModels.EarthquakeEvent;
import com.deltalabs.vision.geospatial.domain.GeospatialModels.FlightTrack;
import com.deltalabs.vision.geospatial.domain.GeospatialModels.RadarFrame;
import com.deltalabs.vision.geospatial.domain.GeospatialModels.SatelliteState;
import com.deltalabs.vision.geospatial.domain.GeospatialModels.Snapshot;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.stereotype.Component;

@Component
public class GeospatialStore {
  private final AtomicReference<Snapshot> snapshotRef = new AtomicReference<>(new Snapshot(
      List.of(),
      List.of(),
      List.of(),
      List.of(),
      List.of(),
      Instant.now()
  ));

  public Snapshot read() {
    return snapshotRef.get();
  }

  public void updateFlights(List<FlightTrack> flights) {
    Snapshot current = snapshotRef.get();
    snapshotRef.set(new Snapshot(
        flights,
        current.militaryFlights(),
        current.earthquakes(),
        current.satellites(),
        current.radarFrames(),
        Instant.now()
    ));
  }

  public void updateMilitaryFlights(List<FlightTrack> militaryFlights) {
    Snapshot current = snapshotRef.get();
    snapshotRef.set(new Snapshot(
        current.flights(),
        militaryFlights,
        current.earthquakes(),
        current.satellites(),
        current.radarFrames(),
        Instant.now()
    ));
  }

  public void updateEarthquakes(List<EarthquakeEvent> earthquakes) {
    Snapshot current = snapshotRef.get();
    snapshotRef.set(new Snapshot(
        current.flights(),
        current.militaryFlights(),
        earthquakes,
        current.satellites(),
        current.radarFrames(),
        Instant.now()
    ));
  }

  public void updateSatellites(List<SatelliteState> satellites) {
    Snapshot current = snapshotRef.get();
    snapshotRef.set(new Snapshot(
        current.flights(),
        current.militaryFlights(),
        current.earthquakes(),
        satellites,
        current.radarFrames(),
        Instant.now()
    ));
  }

  public void updateRadarFrames(List<RadarFrame> frames) {
    Snapshot current = snapshotRef.get();
    snapshotRef.set(new Snapshot(
        current.flights(),
        current.militaryFlights(),
        current.earthquakes(),
        current.satellites(),
        frames,
        Instant.now()
    ));
  }
}
