import type { MarketQuote } from '@vision/shared-types';

export type MarketsState = {
  quotes: MarketQuote[];
  lastUpdated?: string;
};
