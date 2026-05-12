package com.deltalabs.vision.ingestion.domain;

import java.time.Instant;
import java.util.List;

public record PollBatch<T>(String source, List<T> records, Instant fetchedAt, String status) {
}
