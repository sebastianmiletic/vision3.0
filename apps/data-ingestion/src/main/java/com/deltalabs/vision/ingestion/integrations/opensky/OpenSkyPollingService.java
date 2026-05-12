package com.deltalabs.vision.ingestion.integrations.opensky;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.deltalabs.vision.ingestion.config.IntegrationProperties;
import com.deltalabs.vision.ingestion.domain.GeospatialRecords.FlightTrack;
import com.deltalabs.vision.ingestion.domain.PollBatch;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class OpenSkyPollingService {
  private static final Logger LOGGER = LoggerFactory.getLogger(OpenSkyPollingService.class);

  private final IntegrationProperties properties;
  private final OpenSkyTokenClient tokenClient;
  private final ObjectMapper objectMapper;
  private final RestClient restClient;

  public OpenSkyPollingService(IntegrationProperties properties, OpenSkyTokenClient tokenClient, ObjectMapper objectMapper) {
    this.properties = properties;
    this.tokenClient = tokenClient;
    this.objectMapper = objectMapper;
    this.restClient = RestClient.builder().baseUrl(properties.getOpenSky().getBaseUrl()).build();
  }

  public PollBatch<FlightTrack> poll() {
    Instant fetchedAt = Instant.now();
    try {
      String responseBody = restClient.get()
          .uri("/states/all")
          .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenClient.getAccessToken())
          .retrieve()
          .body(String.class);

      List<FlightTrack> records = mapFlights(responseBody, fetchedAt);
      return new PollBatch<>("OpenSky", records, fetchedAt, "OK");
    } catch (Exception exception) {
      LOGGER.warn("OpenSky polling failed: {}", exception.getMessage());
      return new PollBatch<>("OpenSky", List.of(), fetchedAt, "ERROR");
    }
  }

  private List<FlightTrack> mapFlights(String payload, Instant fetchedAt) throws Exception {
    JsonNode root = objectMapper.readTree(payload);
    JsonNode states = root.path("states");
    if (!states.isArray()) {
      return List.of();
    }

    List<FlightTrack> flights = new ArrayList<>();
    for (JsonNode state : states) {
      if (!state.isArray() || state.size() < 11) {
        continue;
      }

      JsonNode lat = state.get(6);
      JsonNode lon = state.get(5);
      if (lat == null || lon == null || lat.isNull() || lon.isNull()) {
        continue;
      }

      String icao24 = state.path(0).asText();
      String callsign = state.path(1).asText("UNKNOWN").trim();
      double altitudeMeters = state.path(7).asDouble(0.0);
      double speedKnots = state.path(9).asDouble(0.0) * 1.94384;
      double headingDegrees = state.path(10).asDouble(0.0);

      flights.add(new FlightTrack(
          "flight-" + icao24,
          callsign,
          lat.asDouble(),
          lon.asDouble(),
          altitudeMeters,
          speedKnots,
          headingDegrees,
          fetchedAt));

      if (flights.size() >= 500) {
        break;
      }
    }
    return flights;
  }
}
