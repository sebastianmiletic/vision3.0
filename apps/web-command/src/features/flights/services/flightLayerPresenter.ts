import { CustomDataSource } from 'cesium';

import { mapFlightToEntityOptions } from './flightEntityMapper';
import { setFlightUiStatus } from './flightUiTelemetry';

import type { Viewer } from 'cesium';
import type { FlightTrack } from '@vision/shared-types';

const LAYER_ID = 'vision-flights-layer';

export async function ensureFlightDataSource(viewer: Viewer): Promise<CustomDataSource> {
  const existing = viewer.dataSources.getByName(LAYER_ID)[0];
  if (existing && existing instanceof CustomDataSource) {
    return existing;
  }

  const dataSource = new CustomDataSource(LAYER_ID);
  await viewer.dataSources.add(dataSource);
  return dataSource;
}

export async function renderFlights(viewer: Viewer, flights: FlightTrack[]) {
  const dataSource = await ensureFlightDataSource(viewer);

  dataSource.entities.removeAll();
  flights.forEach((flight) => {
    dataSource.entities.add(mapFlightToEntityOptions(flight));
  });

  setFlightUiStatus(`OpenSky network · ${flights.length > 0 ? 'live' : 'waiting...'}`, flights.length);
}
