package com.deltalabs.vision.geospatial;

import static org.assertj.core.api.Assertions.assertThat;

import com.deltalabs.vision.geospatial.api.GeospatialController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class GeospatialServiceApplicationTests {
  @Autowired
  private GeospatialController controller;

  @Test
  void contextLoads() {
    assertThat(controller).isNotNull();
  }
}
