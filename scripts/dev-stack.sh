#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

required_ports=(8081 8082 8083 8084)
for port in "${required_ports[@]}"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use. Stop the process first, then rerun npm run dev."
    echo "Hint: lsof -nP -iTCP:$port -sTCP:LISTEN"
    exit 1
  fi
done

npx concurrently -k --names "API,GEO,INGEST" --prefix-colors "green,magenta,yellow" \
  "npm run dev:api-gateway" \
  "npm run dev:geospatial" \
  "npm run dev:ingestion" &
backend_pid=$!

cleanup() {
  kill "$backend_pid" >/dev/null 2>&1 || true
  wait "$backend_pid" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "Waiting for api-gateway on http://localhost:8082 ..."
ready=0
for _ in $(seq 1 120); do
  if ! kill -0 "$backend_pid" >/dev/null 2>&1; then
    echo "Backend process group exited before api-gateway became reachable."
    exit 1
  fi

  if curl -sS --connect-timeout 1 --max-time 2 -o /dev/null "http://localhost:8082/"; then
    ready=1
    break
  fi

  sleep 1
done

if [[ "$ready" -ne 1 ]]; then
  echo "Timed out waiting for api-gateway to accept connections on port 8082."
  exit 1
fi

echo "api-gateway reachable. Launching web app ..."
npm run dev:web
