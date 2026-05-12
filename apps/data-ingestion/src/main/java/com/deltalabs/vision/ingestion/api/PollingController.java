package com.deltalabs.vision.ingestion.api;

import com.deltalabs.vision.ingestion.domain.SourcePollResult;
import com.deltalabs.vision.ingestion.service.PollingOrchestrator;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ingestion")
public class PollingController {
  private final PollingOrchestrator orchestrator;

  public PollingController(PollingOrchestrator orchestrator) {
    this.orchestrator = orchestrator;
  }

  @GetMapping("/run")
  public List<SourcePollResult> runNow() {
    return orchestrator.runAll();
  }
}
