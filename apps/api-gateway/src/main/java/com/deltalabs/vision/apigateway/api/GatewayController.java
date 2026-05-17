package com.deltalabs.vision.apigateway.api;

import com.deltalabs.vision.apigateway.domain.GeospatialRecords.EarthquakeEvent;
import com.deltalabs.vision.apigateway.domain.GeospatialRecords.FlightTrack;
import com.deltalabs.vision.apigateway.domain.GeospatialRecords.MarketQuote;
import com.deltalabs.vision.apigateway.domain.GeospatialRecords.RadarFrame;
import com.deltalabs.vision.apigateway.domain.GeospatialRecords.SatelliteState;
import com.deltalabs.vision.apigateway.domain.WebcamRecords.WebcamCamera;
import com.deltalabs.vision.apigateway.domain.WebcamRecords.WebcamCountry;
import com.deltalabs.vision.apigateway.domain.WebcamRecords.WebcamSearchResponse;
import com.deltalabs.vision.apigateway.service.CctvAddonService;
import com.deltalabs.vision.apigateway.service.GatewaySnapshotService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class GatewayController {
  private final GatewaySnapshotService service;
  private final CctvAddonService cctvAddonService;

  public GatewayController(GatewaySnapshotService service, CctvAddonService cctvAddonService) {
    this.service = service;
    this.cctvAddonService = cctvAddonService;
  }

  @GetMapping("/geospatial/flights")
  public List<FlightTrack> flights() {
    return service.flights();
  }

  @GetMapping("/geospatial/military-flights")
  public List<FlightTrack> militaryFlights() {
    return service.militaryFlights();
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

  @GetMapping("/addons/cctv/countries")
  public List<WebcamCountry> cctvCountries() {
    return cctvAddonService.countries();
  }

  @GetMapping("/addons/cctv/webcams")
  public WebcamSearchResponse cctvWebcams(
      @RequestParam(name = "countryCode", required = false) String countryCode,
      @RequestParam(name = "regionCode", required = false) String regionCode,
      @RequestParam(name = "limit", defaultValue = "48") int limit,
      @RequestParam(name = "offset", defaultValue = "0") int offset,
      @RequestParam(name = "sortBy", defaultValue = "viewCount,desc") String sortBy
  ) {
    return cctvAddonService.webcams(countryCode, regionCode, limit, offset, sortBy);
  }

  @GetMapping("/addons/cctv/webcams/{webcamId}")
  public WebcamCamera cctvWebcamById(@PathVariable("webcamId") long webcamId) {
    return cctvAddonService.webcamById(webcamId);
  }
}
