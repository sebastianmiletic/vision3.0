# Runbook: Local Environment

## Startup

```bash
npm install
npm run dev
```

Open `http://localhost:8081`.

## Port Collision Resolution

If startup reports a port in use:

```bash
lsof -nP -iTCP:8081 -sTCP:LISTEN
lsof -nP -iTCP:8082 -sTCP:LISTEN
lsof -nP -iTCP:8083 -sTCP:LISTEN
lsof -nP -iTCP:8084 -sTCP:LISTEN
```

Stop conflicting processes, then rerun `npm run dev`.

## Service Health Quick Checks

```bash
curl -s http://localhost:8082/api/v1/geospatial/flights
curl -s http://localhost:8083/api/v1/geospatial/snapshot
curl -s http://localhost:8084/api/v1/ingestion/run
```
