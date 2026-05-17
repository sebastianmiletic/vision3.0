package com.deltalabs.vision.ingestion.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "vision.integrations")
public class IntegrationProperties {
  private final OpenSky openSky = new OpenSky();
  private final Usgs usgs = new Usgs();
  private final CelesTrak celesTrak = new CelesTrak();
  private final RainViewer rainViewer = new RainViewer();
  private final AdsbLol adsbLol = new AdsbLol();
  private final Geospatial geospatial = new Geospatial();

  public OpenSky getOpenSky() {
    return openSky;
  }

  public Usgs getUsgs() {
    return usgs;
  }

  public CelesTrak getCelesTrak() {
    return celesTrak;
  }

  public RainViewer getRainViewer() {
    return rainViewer;
  }

  public AdsbLol getAdsbLol() {
    return adsbLol;
  }

  public Geospatial getGeospatial() {
    return geospatial;
  }

  public static class OpenSky {
    private String baseUrl = "https://opensky-network.org/api";
    private String tokenUrl = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
    private String clientId = "";
    private String clientSecret = "";

    public String getBaseUrl() {
      return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
      this.baseUrl = baseUrl;
    }

    public String getTokenUrl() {
      return tokenUrl;
    }

    public void setTokenUrl(String tokenUrl) {
      this.tokenUrl = tokenUrl;
    }

    public String getClientId() {
      return clientId;
    }

    public void setClientId(String clientId) {
      this.clientId = clientId;
    }

    public String getClientSecret() {
      return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
      this.clientSecret = clientSecret;
    }
  }

  public static class Usgs {
    private String feedUrl = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";

    public String getFeedUrl() {
      return feedUrl;
    }

    public void setFeedUrl(String feedUrl) {
      this.feedUrl = feedUrl;
    }
  }

  public static class CelesTrak {
    private String feedUrl = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json";

    public String getFeedUrl() {
      return feedUrl;
    }

    public void setFeedUrl(String feedUrl) {
      this.feedUrl = feedUrl;
    }
  }

  public static class RainViewer {
    private String feedUrl = "https://api.rainviewer.com/public/weather-maps.json";

    public String getFeedUrl() {
      return feedUrl;
    }

    public void setFeedUrl(String feedUrl) {
      this.feedUrl = feedUrl;
    }
  }

  public static class AdsbLol {
    private String baseUrl = "https://api.adsb.lol";

    public String getBaseUrl() {
      return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
      this.baseUrl = baseUrl;
    }
  }

  public static class Geospatial {
    private String baseUrl = "http://localhost:8082";

    public String getBaseUrl() {
      return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
      this.baseUrl = baseUrl;
    }
  }
}
