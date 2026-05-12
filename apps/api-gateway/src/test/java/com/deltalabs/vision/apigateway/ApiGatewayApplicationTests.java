package com.deltalabs.vision.apigateway;

import static org.assertj.core.api.Assertions.assertThat;

import com.deltalabs.vision.apigateway.api.GatewayController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ApiGatewayApplicationTests {
  @Autowired
  private GatewayController controller;

  @Test
  void contextLoads() {
    assertThat(controller).isNotNull();
  }
}
