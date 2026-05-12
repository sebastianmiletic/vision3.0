package com.deltalabs.vision.ingestion.service;

import com.deltalabs.vision.ingestion.domain.PollBatch;
import com.deltalabs.vision.ingestion.domain.SourcePollResult;
import com.deltalabs.vision.ingestion.integrations.celestrak.CelesTrakPollingService;
import com.deltalabs.vision.ingestion.integrations.geospatial.GeospatialIngestClient;
import com.deltalabs.vision.ingestion.integrations.opensky.OpenSkyPollingService;
import com.deltalabs.vision.ingestion.integrations.rainviewer.RainViewerPollingService;
import com.deltalabs.vision.ingestion.integrations.usgs.UsgsPollingService;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class PollingOrchestrator {
  private static final Logger LOGGER = LoggerFactory.getLogger(PollingOrchestrator.class);

  private final OpenSkyPollingService openSkyPollingService;
  private final UsgsPollingService usgsPollingService;
  private final CelesTrakPollingService celesTrakPollingService;
  private final RainViewerPollingService rainViewerPollingService;
  private final GeospatialIngestClient geospatialIngestClient;

  public PollingOrchestrator(OpenSkyPollingService openSkyPollingService,
                             UsgsPollingService usgsPollingService,
                             CelesTrakPollingService celesTrakPollingService,
                             RainViewerPollingService rainViewerPollingService,
                             GeospatialIngestClient geospatialIngestClient) {
    this.openSkyPollingService = openSkyPollingService;
    this.usgsPollingService = usgsPollingService;
    this.celesTrakPollingService = celesTrakPollingService;
    this.rainViewerPollingService = rainViewerPollingService;
    this.geospatialIngestClient = geospatialIngestClient;
  }

  public List<SourcePollResult> runAll() {
    List<SourcePollResult> results = new ArrayList<>();

    var openSkyBatch = openSkyPollingService.poll();
    publish(openSkyBatch, () -> geospatialIngestClient.ingestFlights(openSkyBatch.records()));
    results.add(toResult(openSkyBatch));

    var usgsBatch = usgsPollingService.poll();
    publish(usgsBatch, () -> geospatialIngestClient.ingestEarthquakes(usgsBatch.records()));
    results.add(toResult(usgsBatch));

    var celesTrakBatch = celesTrakPollingService.poll();
    publish(celesTrakBatch, () -> geospatialIngestClient.ingestSatellites(celesTrakBatch.records()));
    results.add(toResult(celesTrakBatch));

    var rainViewerBatch = rainViewerPollingService.poll();
    publish(rainViewerBatch, () -> geospatialIngestClient.ingestRadarFrames(rainViewerBatch.records()));
    results.add(toResult(rainViewerBatch));

    return results;
  }

  private SourcePollResult toResult(PollBatch<?> batch) {
    return new SourcePollResult(batch.source(), batch.records().size(), batch.fetchedAt(), batch.status());
  }

  private void publish(PollBatch<?> batch, Runnable ingestion) {
    if (!"OK".equals(batch.status())) {
      return;
    }

    try {
      ingestion.run();
    } catch (Exception exception) {
      LOGGER.warn("Failed to push {} records from {} into geospatial-service: {}",
          batch.records().size(), batch.source(), exception.getMessage());
    }
  }
}
