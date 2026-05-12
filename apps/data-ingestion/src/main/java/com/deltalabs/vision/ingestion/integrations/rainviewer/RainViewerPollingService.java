package com.deltalabs.vision.ingestion.integrations.rainviewer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.deltalabs.vision.ingestion.config.IntegrationProperties;
import com.deltalabs.vision.ingestion.domain.GeospatialRecords.RadarFrame;
import com.deltalabs.vision.ingestion.domain.PollBatch;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class RainViewerPollingService {
  private static final Logger LOGGER = LoggerFactory.getLogger(RainViewerPollingService.class);

  private final IntegrationProperties properties;
  private final ObjectMapper objectMapper;
  private final RestClient restClient;

  public RainViewerPollingService(IntegrationProperties properties, ObjectMapper objectMapper) {
    this.properties = properties;
    this.objectMapper = objectMapper;
    this.restClient = RestClient.builder().build();
  }

  public PollBatch<RadarFrame> poll() {
    Instant fetchedAt = Instant.now();
    try {
      String responseBody = restClient.get()
          .uri(properties.getRainViewer().getFeedUrl())
          .retrieve()
          .body(String.class);

      List<RadarFrame> records = mapFrames(responseBody, fetchedAt);
      return new PollBatch<>("RainViewer", records, fetchedAt, "OK");
    } catch (Exception exception) {
      LOGGER.warn("RainViewer polling failed: {}", exception.getMessage());
      return new PollBatch<>("RainViewer", List.of(), fetchedAt, "ERROR");
    }
  }

  private List<RadarFrame> mapFrames(String payload, Instant fetchedAt) throws Exception {
    JsonNode root = objectMapper.readTree(payload);
    String host = root.path("host").asText("https://tilecache.rainviewer.com");

    List<RadarFrame> frames = new ArrayList<>();
    JsonNode radarPast = root.path("radar").path("past");
    if (!radarPast.isArray()) {
      return List.of();
    }

    for (JsonNode frame : radarPast) {
      long frameTime = frame.path("time").asLong(0);
      String path = frame.path("path").asText("");
      if (path.isBlank()) {
        continue;
      }

      frames.add(new RadarFrame(
          "radar-" + frameTime,
          frameTime > 0 ? Instant.ofEpochSecond(frameTime) : fetchedAt,
          host + path,
          4,
          "rainviewer"));
    }

    return frames;
  }
}
