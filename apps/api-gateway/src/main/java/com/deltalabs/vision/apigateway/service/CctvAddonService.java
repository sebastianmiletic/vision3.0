package com.deltalabs.vision.apigateway.service;

import com.deltalabs.vision.apigateway.domain.WebcamRecords.WebcamCamera;
import com.deltalabs.vision.apigateway.domain.WebcamRecords.WebcamCountry;
import com.deltalabs.vision.apigateway.domain.WebcamRecords.WebcamSearchResponse;
import com.deltalabs.vision.apigateway.integrations.webcams.WebcamsApiClient;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CctvAddonService {
  private final WebcamsApiClient webcamsApiClient;

  public CctvAddonService(WebcamsApiClient webcamsApiClient) {
    this.webcamsApiClient = webcamsApiClient;
  }

  public List<WebcamCountry> countries() {
    return webcamsApiClient.countries();
  }

  public WebcamSearchResponse webcams(String countryCode, String regionCode, int limit, int offset, String sortBy) {
    return webcamsApiClient.webcams(countryCode, regionCode, limit, offset, sortBy);
  }

  public WebcamCamera webcamById(long webcamId) {
    return webcamsApiClient.webcamById(webcamId);
  }
}
