# Request/Response Examples

## Flights

```http
GET /api/v1/geospatial/flights
```

```json
[
  {
    "id": "a1b2c3",
    "callsign": "DAL123",
    "latitude": 33.9425,
    "longitude": -118.4081,
    "altitudeMeters": 10972,
    "headingDegrees": 73,
    "speedKnots": 452,
    "updatedAt": "2026-05-12T08:13:02Z"
  }
]
```

## Earthquakes

```http
GET /api/v1/geospatial/earthquakes
```

```json
[
  {
    "id": "us7000abcd",
    "magnitude": 4.3,
    "latitude": 38.322,
    "longitude": 142.369,
    "depthKm": 31.2,
    "place": "Near east coast of Honshu, Japan",
    "occurredAt": "2026-05-12T07:50:14Z"
  }
]
```

## Markets

```http
GET /api/v1/markets/quotes
```

```json
[
  {
    "symbol": "SPY",
    "price": 588.21,
    "changePercent": 0.44,
    "currency": "USD",
    "updatedAt": "2026-05-12T08:14:00Z"
  }
]
```
