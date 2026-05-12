package com.deltalabs.vision.ingestion.integrations.celestrak;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.deltalabs.vision.ingestion.config.IntegrationProperties;
import com.deltalabs.vision.ingestion.domain.GeospatialRecords.SatelliteState;
import com.deltalabs.vision.ingestion.domain.PollBatch;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class CelesTrakPollingService {
  private static final Logger LOGGER = LoggerFactory.getLogger(CelesTrakPollingService.class);

  private final IntegrationProperties properties;
  private final ObjectMapper objectMapper;
  private final RestClient restClient;

  public CelesTrakPollingService(IntegrationProperties properties, ObjectMapper objectMapper) {
    this.properties = properties;
    this.objectMapper = objectMapper;
    this.restClient = RestClient.builder().build();
  }

  public PollBatch<SatelliteState> poll() {
    Instant fetchedAt = Instant.now();
    try {
      String responseBody = restClient.get()
          .uri(properties.getCelesTrak().getFeedUrl())
          .retrieve()
          .body(String.class);

      List<SatelliteState> records = mapSatellites(responseBody, fetchedAt);
      return new PollBatch<>("CelesTrak", records, fetchedAt, "OK");
    } catch (Exception exception) {
      LOGGER.warn("CelesTrak polling failed: {}", exception.getMessage());
      return new PollBatch<>("CelesTrak", List.of(), fetchedAt, "ERROR");
    }
  }

  private List<SatelliteState> mapSatellites(String payload, Instant fetchedAt) throws Exception {
    JsonNode root = objectMapper.readTree(payload);
    if (!root.isArray()) {
      return List.of();
    }

    List<SatelliteState> satellites = new ArrayList<>();
    for (JsonNode item : root) {
      int noradId = item.path("NORAD_CAT_ID").asInt(0);
      String name = item.path("OBJECT_NAME").asText("UNKNOWN");
      if (noradId <= 0) {
        continue;
      }

      satellites.add(new SatelliteState(
          "sat-" + noradId,
          noradId,
          name,
          0.0,
          0.0,
          0.0,
          0.0,
          fetchedAt));

      if (satellites.size() >= 500) {
        break;
      }
    }

    return satellites;
  }
}
