import { getJson } from '../apiClient';

import type { CctvCamera, CctvCountry, CctvWebcamSearchResponse } from '../../features/addons/cctv/types';

type CctvQueryParams = {
  countryCode?: string;
  regionCode?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
};

function buildQuery(params: CctvQueryParams) {
  const query = new URLSearchParams();
  if (params.countryCode) {
    query.set('countryCode', params.countryCode);
  }
  if (params.regionCode) {
    query.set('regionCode', params.regionCode);
  }
  query.set('limit', String(params.limit ?? 60));
  query.set('offset', String(params.offset ?? 0));
  query.set('sortBy', params.sortBy ?? 'viewCount,desc');
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

export function fetchCctvCountries(): Promise<CctvCountry[]> {
  return getJson<CctvCountry[]>('/api/v1/addons/cctv/countries');
}

export function fetchCctvWebcams(params: CctvQueryParams = {}): Promise<CctvWebcamSearchResponse> {
  return getJson<CctvWebcamSearchResponse>(`/api/v1/addons/cctv/webcams${buildQuery(params)}`);
}

export function fetchCctvWebcamById(webcamId: number): Promise<CctvCamera> {
  return getJson<CctvCamera>(`/api/v1/addons/cctv/webcams/${webcamId}`);
}
