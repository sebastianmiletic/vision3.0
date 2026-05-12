import { getJson } from '../apiClient';

import type { MarketQuote } from '@vision/shared-types';

export function fetchMarketQuotes(): Promise<MarketQuote[]> {
  return getJson<MarketQuote[]>('/api/v1/markets/quotes');
}
