# Integration: Markets

## Current Behavior

`api-gateway` exposes market quotes at `GET /api/v1/markets/quotes`.

Current implementation is a deterministic service payload (`MarketQuoteService`) suitable for UI integration and contract stabilization.

## Future Provider Path

Planned production direction is OpenBB + Yahoo Finance provider integration. This will replace or augment the current fixed quote source while preserving the public endpoint shape.
