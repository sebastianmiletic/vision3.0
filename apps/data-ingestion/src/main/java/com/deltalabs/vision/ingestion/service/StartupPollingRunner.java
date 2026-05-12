package com.deltalabs.vision.ingestion.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "vision.polling.bootstrap-enabled", havingValue = "true", matchIfMissing = true)
public class StartupPollingRunner {
  private static final Logger LOGGER = LoggerFactory.getLogger(StartupPollingRunner.class);

  private final PollingOrchestrator orchestrator;

  public StartupPollingRunner(PollingOrchestrator orchestrator) {
    this.orchestrator = orchestrator;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void triggerInitialPoll() {
    var results = orchestrator.runAll();
    LOGGER.info("Startup polling complete: {} sources", results.size());
  }
}
