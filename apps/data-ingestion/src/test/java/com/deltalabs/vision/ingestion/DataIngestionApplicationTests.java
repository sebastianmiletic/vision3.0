package com.deltalabs.vision.ingestion;

import static org.assertj.core.api.Assertions.assertThat;

import com.deltalabs.vision.ingestion.api.PollingController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {"vision.polling.enabled=false", "vision.polling.bootstrap-enabled=false"})
class DataIngestionApplicationTests {
  @Autowired
  private PollingController controller;

  @Test
  void contextLoads() {
    assertThat(controller).isNotNull();
  }
}
