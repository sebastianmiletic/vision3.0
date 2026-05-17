package com.deltalabs.vision.apigateway.integrations.geospatial;

import com.deltalabs.vision.apigateway.domain.GeospatialRecords.EarthquakeEvent;
import com.deltalabs.vision.apigateway.domain.GeospatialRecords.FlightTrack;
import com.deltalabs.vision.apigateway.domain.GeospatialRecords.RadarFrame;
import com.deltalabs.vision.apigateway.domain.GeospatialRecords.SatelliteState;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestClient;

@Component
public class GeospatialProxyClient {
  private static final Logger LOGGER = LoggerFactory.getLogger(GeospatialProxyClient.class);

  private final RestClient restClient;

  public GeospatialProxyClient(@Value("${vision.geospatial.base-url:http://localhost:8082}") String baseUrl) {
    this.restClient = RestClient.builder()
        .baseUrl(baseUrl)
        .build();
  }

  public List<FlightTrack> flights() {
    return fetchList("/api/v1/geospatial/flights", new ParameterizedTypeReference<>() {
    });
  }

  public List<FlightTrack> militaryFlights() {
    return fetchList("/api/v1/geospatial/military-flights", new ParameterizedTypeReference<>() {
    });
  }

  public List<EarthquakeEvent> earthquakes() {
    return fetchList("/api/v1/geospatial/earthquakes", new ParameterizedTypeReference<>() {
    });
  }

  public List<SatelliteState> satellites() {
    return fetchList("/api/v1/geospatial/satellites", new ParameterizedTypeReference<>() {
    });
  }

  public List<RadarFrame> radarFrames() {
    return fetchList("/api/v1/geospatial/weather/radar-frames", new ParameterizedTypeReference<>() {
    });
  }

  private <T> List<T> fetchList(String path, ParameterizedTypeReference<List<T>> typeReference) {
    try {
      return restClient.get().uri(path).retrieve().body(typeReference);
    } catch (Exception exception) {
      LOGGER.warn("Failed to proxy {} from geospatial-service: {}", path, exception.getMessage());
      return List.of();
    }
  }
}
