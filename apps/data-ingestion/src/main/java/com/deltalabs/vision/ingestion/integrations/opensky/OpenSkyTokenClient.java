package com.deltalabs.vision.ingestion.integrations.opensky;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.deltalabs.vision.ingestion.config.IntegrationProperties;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class OpenSkyTokenClient {
  private static final Logger LOGGER = LoggerFactory.getLogger(OpenSkyTokenClient.class);

  private final IntegrationProperties properties;
  private final ObjectMapper objectMapper;
  private final RestClient restClient;

  private String accessToken;
  private Instant expiresAt = Instant.EPOCH;

  public OpenSkyTokenClient(IntegrationProperties properties, ObjectMapper objectMapper) {
    this.properties = properties;
    this.objectMapper = objectMapper;
    this.restClient = RestClient.builder().build();
  }

  public synchronized String getAccessToken() {
    if (accessToken != null && Instant.now().isBefore(expiresAt.minus(Duration.ofSeconds(30)))) {
      return accessToken;
    }

    String clientId = properties.getOpenSky().getClientId();
    String clientSecret = properties.getOpenSky().getClientSecret();
    if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
      throw new IllegalStateException("OpenSky credentials are not configured.");
    }

    String payload = "grant_type=client_credentials"
        + "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
        + "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8);

    String responseBody = restClient.post()
        .uri(properties.getOpenSky().getTokenUrl())
        .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
        .body(payload)
        .retrieve()
        .body(String.class);

    try {
      JsonNode json = objectMapper.readTree(responseBody);
      accessToken = json.path("access_token").asText();
      long expiresIn = json.path("expires_in").asLong(1800);
      expiresAt = Instant.now().plusSeconds(expiresIn);
      LOGGER.debug("Fetched OpenSky OAuth token expiring in {}s", expiresIn);
      return accessToken;
    } catch (Exception exception) {
      throw new IllegalStateException("Failed to parse OpenSky token response", exception);
    }
  }
}
