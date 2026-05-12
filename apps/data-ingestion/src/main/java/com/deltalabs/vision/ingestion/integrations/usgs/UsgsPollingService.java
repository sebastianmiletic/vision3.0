package com.deltalabs.vision.ingestion.integrations.usgs;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.deltalabs.vision.ingestion.config.IntegrationProperties;
import com.deltalabs.vision.ingestion.domain.GeospatialRecords.EarthquakeEvent;
import com.deltalabs.vision.ingestion.domain.PollBatch;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class UsgsPollingService {
  private static final Logger LOGGER = LoggerFactory.getLogger(UsgsPollingService.class);

  private final IntegrationProperties properties;
  private final ObjectMapper objectMapper;
  private final RestClient restClient;

  public UsgsPollingService(IntegrationProperties properties, ObjectMapper objectMapper) {
    this.properties = properties;
    this.objectMapper = objectMapper;
    this.restClient = RestClient.builder().build();
  }

  public PollBatch<EarthquakeEvent> poll() {
    Instant fetchedAt = Instant.now();
    try {
      String responseBody = restClient.get()
          .uri(properties.getUsgs().getFeedUrl())
          .retrieve()
          .body(String.class);

      List<EarthquakeEvent> records = mapEarthquakes(responseBody, fetchedAt);
      return new PollBatch<>("USGS", records, fetchedAt, "OK");
    } catch (Exception exception) {
      LOGGER.warn("USGS polling failed: {}", exception.getMessage());
      return new PollBatch<>("USGS", List.of(), fetchedAt, "ERROR");
    }
  }

  private List<EarthquakeEvent> mapEarthquakes(String payload, Instant fetchedAt) throws Exception {
    JsonNode root = objectMapper.readTree(payload);
    JsonNode features = root.path("features");
    if (!features.isArray()) {
      return List.of();
    }

    List<EarthquakeEvent> events = new ArrayList<>();
    for (JsonNode feature : features) {
      JsonNode propertiesNode = feature.path("properties");
      JsonNode geometry = feature.path("geometry");
      JsonNode coordinates = geometry.path("coordinates");
      if (!coordinates.isArray() || coordinates.size() < 3) {
        continue;
      }

      String id = feature.path("id").asText("eq-unknown");
      double magnitude = propertiesNode.path("mag").asDouble(0.0);
      String place = propertiesNode.path("place").asText("Unknown");
      double longitude = coordinates.path(0).asDouble();
      double latitude = coordinates.path(1).asDouble();
      double depthKm = coordinates.path(2).asDouble();
      long eventMillis = propertiesNode.path("time").asLong(0);
      Instant sourceTimestamp = eventMillis > 0 ? Instant.ofEpochMilli(eventMillis) : fetchedAt;

      events.add(new EarthquakeEvent(id, magnitude, depthKm, latitude, longitude, place, sourceTimestamp));
    }

    return events;
  }
}
