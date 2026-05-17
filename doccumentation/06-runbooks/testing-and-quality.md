# Runbook: Testing and Quality

## Frontend Unit/Integration

```bash
npm run test:web
```

## Frontend E2E

```bash
npx playwright install
npm run test:web:e2e
```

## Frontend Static Checks

```bash
npm run check:web
```

## Java Services

Run per service:

```bash
mvn -f apps/pom.xml -pl api-gateway test
mvn -f apps/pom.xml -pl geospatial-service test
mvn -f apps/pom.xml -pl data-ingestion test
```

## Suggested Verification Sequence

1. Start stack with `npm run dev`.
2. Validate `/api/v1` responses.
3. Verify Cesium globe renders on `localhost:8081`.
4. Validate layer updates over at least one poll interval.
