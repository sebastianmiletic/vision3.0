# Module Boundaries

## Frontend (`apps/web-command/src`)

- `features/*`: domain-specific UI and rendering logic.
- `services/integrations/*`: one file per backend endpoint integration.
- `stores/*`: global app UI state (Zustand).
- `styles/legacy/*`: sectioned command-center styling.

## API Gateway

- `api/`: public controllers.
- `service/`: aggregation and transformation logic.
- `integrations/`: downstream service clients.
- `domain/`: record DTOs compatible with shared contracts.

## Geospatial Service

- `api/`: read and ingest endpoints.
- `service/`: snapshot facade.
- `store/`: atomic in-memory state.
- `domain/`: normalized geospatial records.

## Data Ingestion

- `integrations/<provider>/`: provider-specific polling and mapping.
- `integrations/geospatial/`: publish client.
- `service/`: orchestration and startup runs.
- `poller/`: scheduled runner.
- `domain/`: poll result wrappers and normalized records.

## Ownership Rule

- UI behavior belongs in frontend features/components.
- API composition belongs in gateway service layer.
- Normalized geospatial state belongs only in geospatial-service.
- External source protocols and retries belong only in ingestion integrations.
