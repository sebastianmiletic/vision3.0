package com.deltalabs.vision.apigateway.domain;

import java.time.Instant;
import java.util.List;

public final class WebcamRecords {
  private WebcamRecords() {
  }

  public record WebcamCountry(String code, String name) {
  }

  public record WebcamLocation(String city, String region, String regionCode, String country, String countryCode,
                               String continent, String continentCode, double latitude, double longitude) {
  }

  public record WebcamImageSet(String icon, String thumbnail, String preview) {
  }

  public record WebcamImages(WebcamImageSet current, WebcamImageSet daylight) {
  }

  public record WebcamPlayer(String day, String month, String year, String lifetime) {
  }

  public record WebcamCamera(long webcamId, String title, long viewCount, String status, Instant lastUpdatedOn,
                             WebcamLocation location, WebcamImages images, WebcamPlayer player) {
  }

  public record WebcamSearchResponse(int total, List<WebcamCamera> webcams) {
  }
}
