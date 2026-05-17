package com.deltalabs.vision.apigateway.integrations.webcams;

import com.deltalabs.vision.apigateway.domain.WebcamRecords.WebcamCamera;
import com.deltalabs.vision.apigateway.domain.WebcamRecords.WebcamCountry;
import com.deltalabs.vision.apigateway.domain.WebcamRecords.WebcamImageSet;
import com.deltalabs.vision.apigateway.domain.WebcamRecords.WebcamImages;
import com.deltalabs.vision.apigateway.domain.WebcamRecords.WebcamLocation;
import com.deltalabs.vision.apigateway.domain.WebcamRecords.WebcamPlayer;
import com.deltalabs.vision.apigateway.domain.WebcamRecords.WebcamSearchResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class WebcamsApiClient {
  private static final Logger LOGGER = LoggerFactory.getLogger(WebcamsApiClient.class);

  private final RestClient restClient;
  private final ObjectMapper objectMapper;
  private final String apiKey;

  public WebcamsApiClient(
      @Value("${vision.webcams.base-url:https://api.windy.com}") String baseUrl,
      @Value("${vision.webcams.api-key:}") String apiKey,
      ObjectMapper objectMapper
  ) {
    this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    this.apiKey = apiKey == null ? "" : apiKey.trim();
    this.objectMapper = objectMapper;
  }

  public List<WebcamCountry> countries() {
    if (apiKey.isBlank()) {
      return List.of();
    }

    try {
      String payload = restClient.get()
          .uri("/webcams/api/v3/countries")
          .header("x-windy-api-key", apiKey)
          .retrieve()
          .body(String.class);

      JsonNode root = objectMapper.readTree(payload);
      if (!root.isArray()) {
        return List.of();
      }

      List<WebcamCountry> countries = new ArrayList<>();
      root.forEach(item -> {
        String code = item.path("code").asText("").trim();
        String name = item.path("name").asText("").trim();
        if (!code.isEmpty() && !name.isEmpty()) {
          countries.add(new WebcamCountry(code, name));
        }
      });

      countries.sort(Comparator.comparing(WebcamCountry::name));
      return countries;
    } catch (Exception exception) {
      LOGGER.warn("Failed to fetch CCTV countries: {}", exception.getMessage());
      return List.of();
    }
  }

  public WebcamSearchResponse webcams(String countryCode, String regionCode, int limit, int offset, String sortBy) {
    if (apiKey.isBlank()) {
      return new WebcamSearchResponse(0, List.of());
    }

    int normalizedLimit = Math.max(1, Math.min(limit, 120));
    int normalizedOffset = Math.max(offset, 0);
    String sort = (sortBy == null || sortBy.isBlank()) ? "viewCount,desc" : sortBy;

    try {
      String payload = restClient.get()
          .uri(uriBuilder -> {
            uriBuilder.path("/webcams/api/v3/webcams");
            uriBuilder.queryParam("include", "images,location,player");
            uriBuilder.queryParam("limit", normalizedLimit);
            uriBuilder.queryParam("offset", normalizedOffset);
            uriBuilder.queryParam("sortBy", sort);
            if (countryCode != null && !countryCode.isBlank()) {
              uriBuilder.queryParam("countries", countryCode.trim());
            }
            if (regionCode != null && !regionCode.isBlank()) {
              uriBuilder.queryParam("regions", regionCode.trim());
            }
            return uriBuilder.build();
          })
          .header("x-windy-api-key", apiKey)
          .retrieve()
          .body(String.class);

      JsonNode root = objectMapper.readTree(payload);
      int total = root.path("total").asInt(0);
      JsonNode webcamsNode = root.path("webcams");
      if (!webcamsNode.isArray()) {
        return new WebcamSearchResponse(total, List.of());
      }

      List<WebcamCamera> webcams = new ArrayList<>();
      webcamsNode.forEach(node -> {
        WebcamCamera camera = mapCamera(node);
        if (camera != null) {
          webcams.add(camera);
        }
      });
      return new WebcamSearchResponse(total, webcams);
    } catch (Exception exception) {
      LOGGER.warn("Failed to fetch CCTV webcams: {}", exception.getMessage());
      return new WebcamSearchResponse(0, List.of());
    }
  }

  public WebcamCamera webcamById(long webcamId) {
    if (apiKey.isBlank() || webcamId <= 0) {
      return null;
    }

    try {
      String payload = restClient.get()
          .uri(uriBuilder -> uriBuilder
              .path("/webcams/api/v3/webcams/{webcamId}")
              .queryParam("include", "images,location,player")
              .build(webcamId))
          .header("x-windy-api-key", apiKey)
          .retrieve()
          .body(String.class);

      JsonNode root = objectMapper.readTree(payload);
      return mapCamera(root);
    } catch (Exception exception) {
      LOGGER.warn("Failed to fetch CCTV webcam {}: {}", webcamId, exception.getMessage());
      return null;
    }
  }

  private WebcamCamera mapCamera(JsonNode node) {
    if (node == null || node.isNull()) {
      return null;
    }

    long webcamId = node.path("webcamId").asLong(0L);
    if (webcamId <= 0) {
      return null;
    }

    String title = node.path("title").asText("Unknown CCTV camera");
    long viewCount = node.path("viewCount").asLong(0L);
    String status = node.path("status").asText("unknown");
    Instant updatedOn = parseInstant(node.path("lastUpdatedOn").asText(null));

    JsonNode locationNode = node.path("location");
    WebcamLocation location = new WebcamLocation(
        locationNode.path("city").asText(""),
        locationNode.path("region").asText(""),
        locationNode.path("region_code").asText(""),
        locationNode.path("country").asText(""),
        locationNode.path("country_code").asText(""),
        locationNode.path("continent").asText(""),
        locationNode.path("continent_code").asText(""),
        locationNode.path("latitude").asDouble(0.0),
        locationNode.path("longitude").asDouble(0.0)
    );

    JsonNode imagesNode = node.path("images");
    WebcamImageSet current = mapImageSet(imagesNode.path("current"));
    WebcamImageSet daylight = mapImageSet(imagesNode.path("daylight"));
    WebcamImages images = new WebcamImages(current, daylight);

    JsonNode playerNode = node.path("player");
    WebcamPlayer player = new WebcamPlayer(
        playerNode.path("day").asText(""),
        playerNode.path("month").asText(""),
        playerNode.path("year").asText(""),
        playerNode.path("lifetime").asText("")
    );

    return new WebcamCamera(webcamId, title, viewCount, status, updatedOn, location, images, player);
  }

  private WebcamImageSet mapImageSet(JsonNode node) {
    return new WebcamImageSet(
        node.path("icon").asText(""),
        node.path("thumbnail").asText(""),
        node.path("preview").asText("")
    );
  }

  private Instant parseInstant(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      return Instant.parse(value);
    } catch (Exception ignored) {
      return null;
    }
  }
}
