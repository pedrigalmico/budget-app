import { PriceCacheEntry } from '../types';

/**
 * Fetches stock/ETF prices from Alpha Vantage.
 * Free tier: 25 API calls/day.
 */
export async function fetchStockPrice(
  ticker: string,
  apiKey: string
): Promise<PriceCacheEntry | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[PriceService] HTTP ${response.status} for ${ticker}`);
      return null;
    }

    const data = await response.json();

    // Check for API rate limit or error messages
    if (data['Note']) {
      console.warn('[PriceService] API rate limit reached:', data['Note']);
      return null;
    }

    if (data['Error Message']) {
      console.error(`[PriceService] Invalid ticker "${ticker}":`, data['Error Message']);
      return null;
    }

    const quote = data['Global Quote'];
    if (!quote || !quote['05. price']) {
      console.warn(`[PriceService] No price data for "${ticker}"`);
      return null;
    }

    const price = parseFloat(quote['05. price']);
    if (isNaN(price)) {
      console.warn(`[PriceService] Invalid price for "${ticker}":`, quote['05. price']);
      return null;
    }

    return {
      price,
      currency: 'USD', // Alpha Vantage returns USD prices
      lastUpdated: new Date().toISOString(),
      source: 'Alpha Vantage',
    };
  } catch (error) {
    console.error(`[PriceService] Failed to fetch price for "${ticker}":`, error);
    return null;
  }
}

/**
 * Fetches prices for multiple tickers with rate limiting.
 * Adds a 1.5s delay between calls to stay within Alpha Vantage limits
 * (free tier: ~5 calls/min, 25/day).
 */
export async function fetchMultiplePrices(
  tickers: string[],
  apiKey: string,
  onProgress?: (ticker: string, index: number, total: number) => void
): Promise<Record<string, PriceCacheEntry>> {
  const results: Record<string, PriceCacheEntry> = {};

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    onProgress?.(ticker, i, tickers.length);

    const entry = await fetchStockPrice(ticker, apiKey);
    if (entry) {
      results[ticker] = entry;
    }

    // Rate limit: wait 1.5s between calls (except the last one)
    if (i < tickers.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  return results;
}

/**
 * Check if a cached price is stale (older than the given hours).
 */
export function isPriceStale(
  entry: PriceCacheEntry | undefined,
  maxAgeHours: number = 6
): boolean {
  if (!entry) return true;

  const lastUpdated = new Date(entry.lastUpdated).getTime();
  const now = Date.now();
  const ageMs = now - lastUpdated;
  const ageHours = ageMs / (1000 * 60 * 60);

  return ageHours > maxAgeHours;
}
