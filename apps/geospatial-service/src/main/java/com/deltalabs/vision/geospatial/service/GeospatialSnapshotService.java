package com.deltalabs.vision.geospatial.service;

import com.deltalabs.vision.geospatial.domain.GeospatialModels.EarthquakeEvent;
import com.deltalabs.vision.geospatial.domain.GeospatialModels.FlightTrack;
import com.deltalabs.vision.geospatial.domain.GeospatialModels.RadarFrame;
import com.deltalabs.vision.geospatial.domain.GeospatialModels.SatelliteState;
import com.deltalabs.vision.geospatial.domain.GeospatialModels.Snapshot;
import com.deltalabs.vision.geospatial.store.GeospatialStore;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class GeospatialSnapshotService {
  private final GeospatialStore store;

  public GeospatialSnapshotService(GeospatialStore store) {
    this.store = store;
  }

  public Snapshot snapshot() {
    return store.read();
  }

  public List<FlightTrack> flights() {
    return snapshot().flights();
  }

  public List<FlightTrack> militaryFlights() {
    return snapshot().militaryFlights();
  }

  public List<EarthquakeEvent> earthquakes() {
    return snapshot().earthquakes();
  }

  public List<SatelliteState> satellites() {
    return snapshot().satellites();
  }

  public List<RadarFrame> radarFrames() {
    return snapshot().radarFrames();
  }

  public void ingestFlights(List<FlightTrack> flights) {
    store.updateFlights(flights);
  }

  public void ingestMilitaryFlights(List<FlightTrack> flights) {
    store.updateMilitaryFlights(flights);
  }

  public void ingestEarthquakes(List<EarthquakeEvent> earthquakes) {
    store.updateEarthquakes(earthquakes);
  }

  public void ingestSatellites(List<SatelliteState> satellites) {
    store.updateSatellites(satellites);
  }

  public void ingestRadarFrames(List<RadarFrame> radarFrames) {
    store.updateRadarFrames(radarFrames);
  }
}
