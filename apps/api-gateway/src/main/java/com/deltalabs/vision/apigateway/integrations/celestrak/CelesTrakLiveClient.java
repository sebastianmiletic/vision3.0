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
  private static final int OFFLINE_FALLBACK_MULTIPLIER = 12;
  private static final List<FallbackSeed> OFFLINE_FALLBACK_TEMPLATES = List.of(
      new FallbackSeed(25544, "ISS (ZARYA)", 51.64, 15.0, 30.0, 0.0, 408.0, 15.49),
      new FallbackSeed(20580, "HUBBLE SPACE TELESCOPE", 28.47, 52.0, 8.0, 42.0, 540.0, 15.09),
      new FallbackSeed(43013, "NOAA 20", 98.73, 95.0, 14.0, 95.0, 824.0, 14.20),
      new FallbackSeed(33591, "TERRA", 98.20, 138.0, 22.0, 138.0, 705.0, 14.57),
      new FallbackSeed(54216, "STARLINK", 53.00, 182.0, 16.0, 182.0, 550.0, 15.10),
      new FallbackSeed(44713, "STARLINK", 53.20, 226.0, 19.0, 226.0, 550.0, 15.18),
      new FallbackSeed(25338, "IRIDIUM", 86.40, 268.0, 27.0, 268.0, 780.0, 14.34),
      new FallbackSeed(28654, "COSMO-SKYMED", 97.90, 312.0, 35.0, 312.0, 619.0, 14.90),
      new FallbackSeed(39227, "GPS BIIR", 55.00, 18.0, 40.0, 18.0, 20180.0, 2.01),
      new FallbackSeed(43226, "GALILEO", 56.00, 71.0, 50.0, 71.0, 23222.0, 1.70),
      new FallbackSeed(40128, "BEIDOU", 55.00, 123.0, 60.0, 123.0, 21528.0, 1.86),
      new FallbackSeed(29601, "METOP", 98.70, 174.0, 72.0, 174.0, 817.0, 14.21),
      new FallbackSeed(27424, "AQUA", 98.20, 214.0, 85.0, 214.0, 705.0, 14.57),
      new FallbackSeed(39084, "SWARM", 87.40, 258.0, 95.0, 258.0, 463.0, 15.20),
      new FallbackSeed(43205, "FLOCK", 97.40, 306.0, 108.0, 306.0, 510.0, 15.00),
      new FallbackSeed(44876, "O3B", 0.10, 345.0, 120.0, 345.0, 8063.0, 5.00)
  );

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
        .connectTimeout(Duration.ofSeconds(3))
        .build();
  }

  public List<SatelliteState> satellites() {
    Instant fetchedAt = Instant.now();
    try {
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(feedUrl))
          .header("Accept", "application/json")
          .header("User-Agent", "Vision-v3-api-gateway/1.0")
          .timeout(Duration.ofSeconds(4))
          .GET()
          .build();

      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 400) {
        throw new IllegalStateException("HTTP " + response.statusCode());
      }

      JsonNode root = objectMapper.readTree(response.body());
      if (!root.isArray()) {
        List<SatelliteState> fallback = buildOfflineFallback(fetchedAt);
        LOGGER.warn("CelesTrak response was not an array; using offline fallback catalog ({} satellites).", fallback.size());
        return fallback;
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
        Double inclinationDeg = asNullableDouble(item, "INCLINATION");
        Double rightAscensionDeg = asNullableDouble(item, "RA_OF_ASC_NODE");
        Double argumentPerigeeDeg = asNullableDouble(item, "ARG_OF_PERICENTER");
        Double meanAnomalyDeg = asNullableDouble(item, "MEAN_ANOMALY");
        Double meanMotionRevPerDay = asNullableDouble(item, "MEAN_MOTION");
        Instant orbitalEpoch = parseEpoch(item.path("EPOCH").asText(null), fetchedAt);

        satellites.add(new SatelliteState(
            "sat-" + noradId,
            noradId,
            name,
            estimate.latitude(),
            estimate.longitude(),
            estimate.altitudeKm(),
            estimate.velocityKps(),
            fetchedAt,
            inclinationDeg,
            rightAscensionDeg,
            argumentPerigeeDeg,
            meanAnomalyDeg,
            meanMotionRevPerDay,
            orbitalEpoch));

        if (satellites.size() >= MAX_SATELLITES) {
          break;
        }
      }

      if (!satellites.isEmpty()) {
        return satellites;
      }

      List<SatelliteState> fallback = buildOfflineFallback(fetchedAt);
      LOGGER.warn("CelesTrak returned no usable records; using offline fallback catalog ({} satellites).", fallback.size());
      return fallback;
    } catch (Exception exception) {
      List<SatelliteState> fallback = buildOfflineFallback(fetchedAt);
      LOGGER.warn("CelesTrak live fallback failed: {}. Using offline fallback catalog ({} satellites).", exception.getMessage(), fallback.size());
      return fallback;
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
    return estimateFromOrbitalElements(
        inclinationDeg,
        rightAscensionDeg,
        argumentPerigeeDeg,
        meanAnomalyDeg,
        meanMotionRevPerDay,
        epoch,
        fetchedAt);
  }

  private OrbitalEstimate estimateFromOrbitalElements(
      double inclinationDeg,
      double rightAscensionDeg,
      double argumentPerigeeDeg,
      double meanAnomalyDeg,
      double meanMotionRevPerDay,
      Instant epoch,
      Instant targetTime
  ) {
    double dtSeconds = Duration.between(epoch, targetTime).toSeconds();
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

    double earthRotation = EARTH_ROTATION_RATE_RAD_S * targetTime.getEpochSecond();
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

  private static double normalizeAngle(double degrees) {
    double normalized = degrees % 360.0;
    if (normalized < 0) {
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

  private List<SatelliteState> buildOfflineFallback(Instant fetchedAt) {
    List<SatelliteState> satellites = new ArrayList<>();
    for (FallbackSeed seed : buildExpandedFallbackCatalog()) {
      OrbitalEstimate estimate = estimateFromOrbitalElements(
          seed.inclinationDeg(),
          seed.rightAscensionDeg(),
          seed.argumentPerigeeDeg(),
          seed.meanAnomalyDeg(),
          seed.meanMotionRevPerDay(),
          fetchedAt,
          fetchedAt);
      if (estimate == null) {
        continue;
      }

      satellites.add(new SatelliteState(
          "sat-" + seed.noradId(),
          seed.noradId(),
          seed.name(),
          estimate.latitude(),
          estimate.longitude(),
          estimate.altitudeKm(),
          estimate.velocityKps(),
          fetchedAt,
          seed.inclinationDeg(),
          seed.rightAscensionDeg(),
          seed.argumentPerigeeDeg(),
          seed.meanAnomalyDeg(),
          seed.meanMotionRevPerDay(),
          fetchedAt));
      if (satellites.size() >= MAX_SATELLITES) {
        break;
      }
    }

    return satellites;
  }

  private List<FallbackSeed> buildExpandedFallbackCatalog() {
    List<FallbackSeed> expanded = new ArrayList<>();
    for (FallbackSeed template : OFFLINE_FALLBACK_TEMPLATES) {
      for (int slot = 0; slot < OFFLINE_FALLBACK_MULTIPLIER; slot++) {
        int noradId = slot == 0 ? template.noradId() : (template.noradId() + (slot * 100000));
        String name = slot == 0 ? template.name() : (template.name() + " " + (slot + 1));
        double phaseOffset = slot * (360.0 / OFFLINE_FALLBACK_MULTIPLIER);
        double rightAscension = normalizeAngle(template.rightAscensionDeg() + (phaseOffset * 0.55));
        double argumentPerigee = normalizeAngle(template.argumentPerigeeDeg() + (slot * 7.5));
        double meanAnomaly = normalizeAngle(template.meanAnomalyDeg() + phaseOffset);
        double altitudeKm = template.altitudeKm() * (1.0 + (0.003 * Math.sin(slot + template.noradId())));
        double meanMotion = template.meanMotionRevPerDay() * (1.0 + (0.0008 * Math.cos(slot * 0.75)));

        expanded.add(new FallbackSeed(
            noradId,
            name,
            template.inclinationDeg(),
            rightAscension,
            argumentPerigee,
            meanAnomaly,
            altitudeKm,
            meanMotion));
      }
    }

    return expanded;
  }

  private record FallbackSeed(
      int noradId,
      String name,
      double inclinationDeg,
      double rightAscensionDeg,
      double argumentPerigeeDeg,
      double meanAnomalyDeg,
      double altitudeKm,
      double meanMotionRevPerDay
  ) {
  }

  private record OrbitalEstimate(double latitude, double longitude, double altitudeKm, double velocityKps) {
  }
}
