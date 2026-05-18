package com.deltalabs.vision.apigateway.integrations.celestrak;

import com.deltalabs.vision.apigateway.domain.GeospatialRecords.SatelliteState;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CelesTrakLiveClient {
  private static final Logger LOGGER = LoggerFactory.getLogger(CelesTrakLiveClient.class);

  private static final double EARTH_GRAVITATIONAL_PARAMETER_KM3_S2 = 398600.4418;
  private static final double EARTH_EQUATORIAL_RADIUS_KM = 6378.137;
  private static final double EARTH_ROTATION_RATE_RAD_S = 7.2921159e-5;
  private static final int MAX_SATELLITES = 500;

  private final String feedUrl;
  private final ObjectMapper objectMapper;
  private final HttpClient httpClient;

  public CelesTrakLiveClient(
      @Value("${vision.celestrak.feed-url:https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json}") String feedUrl,
      ObjectMapper objectMapper
  ) {
    this.feedUrl = feedUrl;
    this.objectMapper = objectMapper;
    this.httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();
  }

  public List<SatelliteState> satellites() {
    Instant fetchedAt = Instant.now();
    try {
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(feedUrl))
          .header("Accept", "application/json")
          .header("User-Agent", "Vision-v3-api-gateway/1.0")
          .timeout(Duration.ofSeconds(20))
          .GET()
          .build();

      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 400) {
        throw new IllegalStateException("HTTP " + response.statusCode());
      }

      JsonNode root = objectMapper.readTree(response.body());
      if (!root.isArray()) {
        return List.of();
      }

      List<SatelliteState> satellites = new ArrayList<>();
      for (JsonNode item : root) {
        int noradId = item.path("NORAD_CAT_ID").asInt(0);
        if (noradId <= 0) {
          continue;
        }

        String name = item.path("OBJECT_NAME").asText("UNKNOWN");
        OrbitalEstimate estimate = estimateCurrentState(item, fetchedAt);
        if (estimate == null) {
          continue;
        }

        satellites.add(new SatelliteState(
            "sat-" + noradId,
            noradId,
            name,
            estimate.latitude(),
            estimate.longitude(),
            estimate.altitudeKm(),
            estimate.velocityKps(),
            fetchedAt));

        if (satellites.size() >= MAX_SATELLITES) {
          break;
        }
      }

      return satellites;
    } catch (Exception exception) {
      LOGGER.warn("CelesTrak live fallback failed: {}", exception.getMessage());
      return List.of();
    }
  }

  private OrbitalEstimate estimateCurrentState(JsonNode item, Instant fetchedAt) {
    Double latitude = asNullableDouble(item, "LATITUDE", "LAT");
    Double longitude = asNullableDouble(item, "LONGITUDE", "LON");
    if (isValidCoordinate(latitude, longitude)) {
      double altitudeKm = normalizedPositive(asNullableDouble(item, "ALTITUDE", "ALTITUDE_KM"), 420.0);
      double velocityKps = normalizedPositive(asNullableDouble(item, "VELOCITY", "VELOCITY_KPS"), 7.66);
      return new OrbitalEstimate(latitude, normalizeLongitude(longitude), altitudeKm, velocityKps);
    }

    Double inclinationDeg = asNullableDouble(item, "INCLINATION");
    Double rightAscensionDeg = asNullableDouble(item, "RA_OF_ASC_NODE");
    Double argumentPerigeeDeg = asNullableDouble(item, "ARG_OF_PERICENTER");
    Double meanAnomalyDeg = asNullableDouble(item, "MEAN_ANOMALY");
    Double meanMotionRevPerDay = asNullableDouble(item, "MEAN_MOTION");

    if (inclinationDeg == null
        || rightAscensionDeg == null
        || argumentPerigeeDeg == null
        || meanAnomalyDeg == null
        || meanMotionRevPerDay == null
        || meanMotionRevPerDay <= 0) {
      return null;
    }

    Instant epoch = parseEpoch(item.path("EPOCH").asText(null), fetchedAt);
    double dtSeconds = Duration.between(epoch, fetchedAt).toSeconds();
    double meanMotionRadPerSecond = meanMotionRevPerDay * 2.0 * Math.PI / 86400.0;
    if (!Double.isFinite(meanMotionRadPerSecond) || meanMotionRadPerSecond <= 0) {
      return null;
    }

    double semiMajorAxisKm = Math.cbrt(EARTH_GRAVITATIONAL_PARAMETER_KM3_S2 / (meanMotionRadPerSecond * meanMotionRadPerSecond));
    if (!Double.isFinite(semiMajorAxisKm) || semiMajorAxisKm < EARTH_EQUATORIAL_RADIUS_KM) {
      return null;
    }

    double inclination = Math.toRadians(inclinationDeg);
    double rightAscension = Math.toRadians(rightAscensionDeg);
    double argumentPerigee = Math.toRadians(argumentPerigeeDeg);
    double meanAnomaly = Math.toRadians(meanAnomalyDeg) + meanMotionRadPerSecond * dtSeconds;
    double argumentOfLatitude = meanAnomaly + argumentPerigee;

    double cosO = Math.cos(rightAscension);
    double sinO = Math.sin(rightAscension);
    double cosI = Math.cos(inclination);
    double sinI = Math.sin(inclination);
    double cosU = Math.cos(argumentOfLatitude);
    double sinU = Math.sin(argumentOfLatitude);

    double xEci = semiMajorAxisKm * (cosO * cosU - sinO * sinU * cosI);
    double yEci = semiMajorAxisKm * (sinO * cosU + cosO * sinU * cosI);
    double zEci = semiMajorAxisKm * (sinU * sinI);

    double earthRotation = EARTH_ROTATION_RATE_RAD_S * fetchedAt.getEpochSecond();
    double cosTheta = Math.cos(earthRotation);
    double sinTheta = Math.sin(earthRotation);
    double xEcef = cosTheta * xEci + sinTheta * yEci;
    double yEcef = -sinTheta * xEci + cosTheta * yEci;
    double zEcef = zEci;

    double radiusKm = Math.sqrt((xEcef * xEcef) + (yEcef * yEcef) + (zEcef * zEcef));
    if (!Double.isFinite(radiusKm) || radiusKm <= 0) {
      return null;
    }

    double derivedLatitude = Math.toDegrees(Math.atan2(zEcef, Math.sqrt((xEcef * xEcef) + (yEcef * yEcef))));
    double derivedLongitude = Math.toDegrees(Math.atan2(yEcef, xEcef));
    double altitudeKm = Math.max(radiusKm - EARTH_EQUATORIAL_RADIUS_KM, 1.0);
    double velocityKps = Math.max(meanMotionRadPerSecond * semiMajorAxisKm, 0.1);

    if (!isValidCoordinate(derivedLatitude, derivedLongitude)) {
      return null;
    }

    return new OrbitalEstimate(derivedLatitude, normalizeLongitude(derivedLongitude), altitudeKm, velocityKps);
  }

  private static Double asNullableDouble(JsonNode node, String... keys) {
    for (String key : keys) {
      JsonNode value = node.get(key);
      if (value == null || value.isNull()) {
        continue;
      }
      if (value.isNumber()) {
        return value.asDouble();
      }
      if (value.isTextual()) {
        try {
          return Double.parseDouble(value.asText());
        } catch (NumberFormatException ignored) {
          return null;
        }
      }
    }
    return null;
  }

  private static boolean isValidCoordinate(Double latitude, Double longitude) {
    return latitude != null
        && longitude != null
        && Double.isFinite(latitude)
        && Double.isFinite(longitude)
        && latitude >= -90
        && latitude <= 90
        && longitude >= -180
        && longitude <= 180;
  }

  private static double normalizeLongitude(double longitude) {
    double normalized = longitude;
    while (normalized > 180.0) {
      normalized -= 360.0;
    }
    while (normalized < -180.0) {
      normalized += 360.0;
    }
    return normalized;
  }

  private static double normalizedPositive(Double value, double fallback) {
    if (value == null || !Double.isFinite(value) || value <= 0) {
      return fallback;
    }
    return value;
  }

  private static Instant parseEpoch(String rawEpoch, Instant fallback) {
    if (rawEpoch == null || rawEpoch.isBlank()) {
      return fallback;
    }
    try {
      return Instant.parse(rawEpoch);
    } catch (Exception ignored) {
      try {
        return LocalDateTime.parse(rawEpoch).toInstant(ZoneOffset.UTC);
      } catch (Exception ignoredAgain) {
        return fallback;
      }
    }
  }

  private record OrbitalEstimate(double latitude, double longitude, double altitudeKm, double velocityKps) {
  }
}
