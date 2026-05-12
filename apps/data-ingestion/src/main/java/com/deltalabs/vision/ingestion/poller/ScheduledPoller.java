package com.deltalabs.vision.ingestion.poller;

import com.deltalabs.vision.ingestion.domain.SourcePollResult;
import com.deltalabs.vision.ingestion.service.PollingOrchestrator;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "vision.polling.enabled", havingValue = "true", matchIfMissing = true)
public class ScheduledPoller {
  private static final Logger LOGGER = LoggerFactory.getLogger(ScheduledPoller.class);

  private final PollingOrchestrator orchestrator;

  public ScheduledPoller(PollingOrchestrator orchestrator) {
    this.orchestrator = orchestrator;
  }

  @Scheduled(fixedDelayString = "${vision.polling.interval-ms:30000}")
  public void pollSources() {
    List<SourcePollResult> results = orchestrator.runAll();
    LOGGER.info("Polling cycle completed for {} sources", results.size());
  }
}
