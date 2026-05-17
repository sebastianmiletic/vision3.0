package com.deltalabs.vision.geospatial.api;

import com.deltalabs.vision.geospatial.domain.GeospatialModels.EarthquakeEvent;
import com.deltalabs.vision.geospatial.domain.GeospatialModels.FlightTrack;
import com.deltalabs.vision.geospatial.domain.GeospatialModels.RadarFrame;
import com.deltalabs.vision.geospatial.domain.GeospatialModels.SatelliteState;
import com.deltalabs.vision.geospatial.domain.GeospatialModels.Snapshot;
import com.deltalabs.vision.geospatial.service.GeospatialSnapshotService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/geospatial")
public class GeospatialController {
  private final GeospatialSnapshotService service;

  public GeospatialController(GeospatialSnapshotService service) {
    this.service = service;
  }

  @GetMapping("/snapshot")
  public Snapshot snapshot() {
    return service.snapshot();
  }

  @GetMapping("/flights")
  public List<FlightTrack> flights() {
    return service.flights();
  }

  @GetMapping("/military-flights")
  public List<FlightTrack> militaryFlights() {
    return service.militaryFlights();
  }

  @GetMapping("/earthquakes")
  public List<EarthquakeEvent> earthquakes() {
    return service.earthquakes();
  }

  @GetMapping("/satellites")
  public List<SatelliteState> satellites() {
    return service.satellites();
  }

  @GetMapping("/weather/radar-frames")
  public List<RadarFrame> radarFrames() {
    return service.radarFrames();
  }

  @PostMapping("/ingest/flights")
  public void ingestFlights(@RequestBody List<FlightTrack> flights) {
    service.ingestFlights(flights);
  }

  @PostMapping("/ingest/military-flights")
  public void ingestMilitaryFlights(@RequestBody List<FlightTrack> flights) {
    service.ingestMilitaryFlights(flights);
  }

  @PostMapping("/ingest/earthquakes")
  public void ingestEarthquakes(@RequestBody List<EarthquakeEvent> earthquakes) {
    service.ingestEarthquakes(earthquakes);
  }

  @PostMapping("/ingest/satellites")
  public void ingestSatellites(@RequestBody List<SatelliteState> satellites) {
    service.ingestSatellites(satellites);
  }

  @PostMapping("/ingest/weather/radar-frames")
  public void ingestRadarFrames(@RequestBody List<RadarFrame> radarFrames) {
    service.ingestRadarFrames(radarFrames);
  }
}
