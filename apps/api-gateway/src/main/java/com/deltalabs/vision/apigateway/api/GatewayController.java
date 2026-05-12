package com.deltalabs.vision.apigateway.api;

import com.deltalabs.vision.apigateway.domain.GeospatialRecords.EarthquakeEvent;
import com.deltalabs.vision.apigateway.domain.GeospatialRecords.FlightTrack;
import com.deltalabs.vision.apigateway.domain.GeospatialRecords.MarketQuote;
import com.deltalabs.vision.apigateway.domain.GeospatialRecords.RadarFrame;
import com.deltalabs.vision.apigateway.domain.GeospatialRecords.SatelliteState;
import com.deltalabs.vision.apigateway.service.GatewaySnapshotService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class GatewayController {
  private final GatewaySnapshotService service;

  public GatewayController(GatewaySnapshotService service) {
    this.service = service;
  }

  @GetMapping("/geospatial/flights")
  public List<FlightTrack> flights() {
    return service.flights();
  }

  @GetMapping("/geospatial/earthquakes")
  public List<EarthquakeEvent> earthquakes() {
    return service.earthquakes();
  }

  @GetMapping("/geospatial/satellites")
  public List<SatelliteState> satellites() {
    return service.satellites();
  }

  @GetMapping("/geospatial/weather/radar-frames")
  public List<RadarFrame> radarFrames() {
    return service.radarFrames();
  }

  @GetMapping("/markets/quotes")
  public List<MarketQuote> marketQuotes() {
    return service.markets();
  }
}
