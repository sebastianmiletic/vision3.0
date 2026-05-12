package com.deltalabs.vision.ingestion.domain;

import java.time.Instant;

public record SourcePollResult(String source, int recordsFetched, Instant fetchedAt, String status) {
}
