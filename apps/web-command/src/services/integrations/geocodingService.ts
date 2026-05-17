type NominatimSearchResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
};

export type GeocodeResult = {
  label: string;
  latitude: number;
  longitude: number;
};

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

export async function geocodePlace(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    limit: '1',
    addressdetails: '1',
  });

  const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as NominatimSearchResult[];
  const first = payload[0];
  if (!first?.lat || !first?.lon) {
    return null;
  }

  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    label: first.display_name ?? trimmed,
    latitude,
    longitude,
  };
}
