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

required_ports=(8080 8081 8082 8083)
for port in "${required_ports[@]}"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use. Stop the process first, then rerun npm run dev."
    echo "Hint: lsof -nP -iTCP:$port -sTCP:LISTEN"
    exit 1
  fi
done

npx concurrently -k --names "WEB,API,GEO,INGEST" --prefix-colors "cyan,green,magenta,yellow" \
  "npm run dev:web" \
  "npm run dev:api-gateway" \
  "npm run dev:geospatial" \
  "npm run dev:ingestion"
