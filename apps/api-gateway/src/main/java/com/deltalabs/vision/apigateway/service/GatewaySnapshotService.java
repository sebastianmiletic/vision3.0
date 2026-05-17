package com.deltalabs.vision.apigateway.service;

import com.deltalabs.vision.apigateway.domain.GeospatialRecords.EarthquakeEvent;
import com.deltalabs.vision.apigateway.domain.GeospatialRecords.FlightTrack;
import com.deltalabs.vision.apigateway.domain.GeospatialRecords.MarketQuote;
import com.deltalabs.vision.apigateway.domain.GeospatialRecords.RadarFrame;
import com.deltalabs.vision.apigateway.domain.GeospatialRecords.SatelliteState;
import com.deltalabs.vision.apigateway.integrations.geospatial.GeospatialProxyClient;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class GatewaySnapshotService {
  private final GeospatialProxyClient geospatialProxyClient;
  private final MarketQuoteService marketQuoteService;

  public GatewaySnapshotService(GeospatialProxyClient geospatialProxyClient, MarketQuoteService marketQuoteService) {
    this.geospatialProxyClient = geospatialProxyClient;
    this.marketQuoteService = marketQuoteService;
  }

  public List<FlightTrack> flights() {
    return geospatialProxyClient.flights();
  }

  public List<FlightTrack> militaryFlights() {
    return geospatialProxyClient.militaryFlights();
  }

  public List<EarthquakeEvent> earthquakes() {
    return geospatialProxyClient.earthquakes();
  }

  public List<SatelliteState> satellites() {
    return geospatialProxyClient.satellites();
  }

  public List<RadarFrame> radarFrames() {
    return geospatialProxyClient.radarFrames();
  }

  public List<MarketQuote> markets() {
    return marketQuoteService.quotes();
  }
}
