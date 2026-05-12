package com.deltalabs.vision.apigateway.service;

import com.deltalabs.vision.apigateway.domain.GeospatialRecords.MarketQuote;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MarketQuoteService {
  public List<MarketQuote> quotes() {
    return List.of(
        new MarketQuote("SPY", 588.21, 0.44, "USD", Instant.now()),
        new MarketQuote("QQQ", 521.12, 0.36, "USD", Instant.now()),
        new MarketQuote("DIA", 442.89, 0.29, "USD", Instant.now())
    );
  }
}
