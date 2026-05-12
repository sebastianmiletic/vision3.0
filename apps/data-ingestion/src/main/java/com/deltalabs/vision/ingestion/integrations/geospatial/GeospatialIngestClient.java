package com.deltalabs.vision.ingestion.integrations.geospatial;

import com.deltalabs.vision.ingestion.config.IntegrationProperties;
import com.deltalabs.vision.ingestion.domain.GeospatialRecords.EarthquakeEvent;
import com.deltalabs.vision.ingestion.domain.GeospatialRecords.FlightTrack;
import com.deltalabs.vision.ingestion.domain.GeospatialRecords.RadarFrame;
import com.deltalabs.vision.ingestion.domain.GeospatialRecords.SatelliteState;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class GeospatialIngestClient {
  private final RestClient restClient;

  public GeospatialIngestClient(IntegrationProperties properties) {
    this.restClient = RestClient.builder().baseUrl(properties.getGeospatial().getBaseUrl()).build();
  }

  public void ingestFlights(List<FlightTrack> flights) {
    restClient.post().uri("/api/v1/geospatial/ingest/flights").body(flights).retrieve().toBodilessEntity();
  }

  public void ingestEarthquakes(List<EarthquakeEvent> earthquakes) {
    restClient.post().uri("/api/v1/geospatial/ingest/earthquakes").body(earthquakes).retrieve().toBodilessEntity();
  }

  public void ingestSatellites(List<SatelliteState> satellites) {
    restClient.post().uri("/api/v1/geospatial/ingest/satellites").body(satellites).retrieve().toBodilessEntity();
  }

  public void ingestRadarFrames(List<RadarFrame> radarFrames) {
    restClient.post().uri("/api/v1/geospatial/ingest/weather/radar-frames").body(radarFrames).retrieve().toBodilessEntity();
  }
}
