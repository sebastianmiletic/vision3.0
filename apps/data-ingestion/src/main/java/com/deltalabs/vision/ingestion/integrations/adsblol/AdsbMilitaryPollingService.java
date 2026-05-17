package com.deltalabs.vision.ingestion.integrations.adsblol;

import com.deltalabs.vision.ingestion.config.IntegrationProperties;
import com.deltalabs.vision.ingestion.domain.GeospatialRecords.FlightTrack;
import com.deltalabs.vision.ingestion.domain.PollBatch;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AdsbMilitaryPollingService {
  private static final Logger LOGGER = LoggerFactory.getLogger(AdsbMilitaryPollingService.class);
  private static final int MAX_RECORDS = 1200;

  private final ObjectMapper objectMapper;
  private final RestClient restClient;

  public AdsbMilitaryPollingService(IntegrationProperties properties, ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
    this.restClient = RestClient.builder()
        .baseUrl(properties.getAdsbLol().getBaseUrl())
        .build();
  }

  public PollBatch<FlightTrack> poll() {
    Instant fetchedAt = Instant.now();
    try {
      String responseBody = restClient.get()
          .uri("/v2/mil")
          .retrieve()
          .body(String.class);
      List<FlightTrack> flights = mapFlights(responseBody, fetchedAt);
      return new PollBatch<>("ADSB.lol Military", flights, fetchedAt, "OK");
    } catch (Exception exception) {
      LOGGER.warn("ADSB.lol military polling failed: {}", exception.getMessage());
      return new PollBatch<>("ADSB.lol Military", List.of(), fetchedAt, "ERROR");
    }
  }

  private List<FlightTrack> mapFlights(String payload, Instant fetchedAt) throws Exception {
    JsonNode root = objectMapper.readTree(payload);
    JsonNode aircraft = root.path("ac");
    if (!aircraft.isArray()) {
      return List.of();
    }

    List<FlightTrack> flights = new ArrayList<>();
    for (JsonNode ac : aircraft) {
      JsonNode latNode = ac.get("lat");
      JsonNode lonNode = ac.get("lon");
      if (latNode == null || lonNode == null || latNode.isNull() || lonNode.isNull()) {
        continue;
      }
      if (!latNode.isNumber() || !lonNode.isNumber()) {
        continue;
      }

      double latitude = latNode.asDouble();
      double longitude = lonNode.asDouble();
      if (!Double.isFinite(latitude)
          || !Double.isFinite(longitude)
          || latitude < -90
          || latitude > 90
          || longitude < -180
          || longitude > 180) {
        continue;
      }

      String hex = ac.path("hex").asText("").trim().toLowerCase();
      if (hex.isEmpty()) {
        continue;
      }

      String flight = ac.path("flight").asText("").trim();
      String callsign = flight.isEmpty() ? "MIL-" + hex.toUpperCase() : flight;

      double barometricAltitude = numberOrNaN(ac.get("alt_baro"));
      double geometricAltitude = numberOrNaN(ac.get("alt_geom"));
      double altitudeMeters = Double.isFinite(barometricAltitude)
          ? barometricAltitude * 0.3048
          : Double.isFinite(geometricAltitude) ? geometricAltitude * 0.3048 : 0.0;
      double speedKnots = Math.max(ac.path("gs").asDouble(0.0), 0.0);
      double headingDegrees = ac.path("track").asDouble(ac.path("true_heading").asDouble(0.0));

      flights.add(new FlightTrack(
          "mil-" + hex,
          callsign,
          latitude,
          longitude,
          altitudeMeters,
          speedKnots,
          headingDegrees,
          fetchedAt
      ));

      if (flights.size() >= MAX_RECORDS) {
        break;
      }
    }
    return flights;
  }

  private double numberOrNaN(JsonNode node) {
    if (node == null || node.isNull()) {
      return Double.NaN;
    }
    if (node.isNumber()) {
      return node.asDouble();
    }
    if (!node.isTextual()) {
      return Double.NaN;
    }
    String value = node.asText("").trim();
    if (value.isEmpty() || "ground".equalsIgnoreCase(value)) {
      return 0.0;
    }
    try {
      return Double.parseDouble(value);
    } catch (NumberFormatException ignored) {
      return Double.NaN;
    }
  }
}
