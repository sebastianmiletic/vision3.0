import { prewarmGooglePhotorealisticTiles } from '../../features/globe/services/tileProvider';
import { fetchFlights } from '../integrations/flightsService';
import { fetchMilitaryFlights } from '../integrations/militaryFlightsService';
import { fetchSatellites } from '../integrations/satellitesService';
import { registerVisionServiceWorker } from '../../registerServiceWorker';

import type { FlightTrack, SatelliteState } from '@vision/shared-types';

const STARTUP_TIMEOUT_MS = 8500;
const TILE_WARMUP_TIMEOUT_MS = 4500;
const API_WARMUP_TIMEOUT_MS = 5200;

type StartupLayerSnapshot = {
  flights: FlightTrack[] | null;
  militaryFlights: FlightTrack[] | null;
  satellites: SatelliteState[] | null;
};

let startupBootstrapPromise: Promise<void> | null = null;
let startupLayerSnapshot: StartupLayerSnapshot = {
  flights: null,
  militaryFlights: null,
  satellites: null,
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`Startup task timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    promise
      .then((result) => {
        window.clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

async function warmStartupApis() {
  const [flights, militaryFlights, satellites] = await Promise.allSettled([
    withTimeout(fetchFlights(), API_WARMUP_TIMEOUT_MS),
    withTimeout(fetchMilitaryFlights(), API_WARMUP_TIMEOUT_MS),
    withTimeout(fetchSatellites(false), API_WARMUP_TIMEOUT_MS),
  ]);

  startupLayerSnapshot = {
    flights: flights.status === 'fulfilled' ? flights.value : null,
    militaryFlights: militaryFlights.status === 'fulfilled' ? militaryFlights.value : null,
    satellites: satellites.status === 'fulfilled' ? satellites.value : null,
  };
}

async function warmStartupTiles() {
  const provider = import.meta.env.VITE_TILE_PROVIDER ?? 'google';
  if (provider !== 'google') {
    return;
  }

  await withTimeout(
    prewarmGooglePhotorealisticTiles(import.meta.env.VITE_GOOGLE_MAPS_API_KEY),
    TILE_WARMUP_TIMEOUT_MS,
  );
}

export function takeStartupFlights(): FlightTrack[] | null {
  const snapshot = startupLayerSnapshot.flights;
  startupLayerSnapshot.flights = null;
  return snapshot;
}

export function takeStartupMilitaryFlights(): FlightTrack[] | null {
  const snapshot = startupLayerSnapshot.militaryFlights;
  startupLayerSnapshot.militaryFlights = null;
  return snapshot;
}

export function takeStartupSatellites(): SatelliteState[] | null {
  const snapshot = startupLayerSnapshot.satellites;
  startupLayerSnapshot.satellites = null;
  return snapshot;
}

export function prepareVisionStartup(): Promise<void> {
  if (startupBootstrapPromise) {
    return startupBootstrapPromise;
  }

  startupBootstrapPromise = withTimeout(
    (async () => {
      await registerVisionServiceWorker();
      await Promise.allSettled([warmStartupTiles(), warmStartupApis()]);
    })(),
    STARTUP_TIMEOUT_MS,
  ).finally(() => {
    startupBootstrapPromise = null;
  });

  return startupBootstrapPromise;
}
