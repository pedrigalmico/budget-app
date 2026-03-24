import { PriceCacheEntry } from '../types';

/**
 * Base commodity definitions — these are the actual API symbols.
 */
const BASE_COMMODITIES: Record<string, { name: string; gramsPerOz: number }> = {
  'XAU': { name: 'Gold (24K)', gramsPerOz: 31.1035 },
  'XAG': { name: 'Silver', gramsPerOz: 31.1035 },
  'XPT': { name: 'Platinum', gramsPerOz: 31.1035 },
  'XPD': { name: 'Palladium', gramsPerOz: 31.1035 },
};

/**
 * Gold karat purity variants.
 * Ticker format: XAU-{karat}K (e.g. XAU-18K, XAU-21K)
 * XAU (no suffix) = 24K pure gold.
 */
const GOLD_KARAT_PURITY: Record<string, number> = {
  '24K': 24 / 24, // 100% pure
  '22K': 22 / 24, // 91.67%
  '21K': 21 / 24, // 87.50%
  '18K': 18 / 24, // 75.00%
  '14K': 14 / 24, // 58.33%
};

interface CommodityInfo {
  apiSymbol: string;    // The actual symbol to query (e.g. XAU)
  name: string;
  gramsPerOz: number;
  purity: number;       // 1.0 for pure, 0.75 for 18K, etc.
}

/**
 * Resolve a ticker to commodity info.
 * Supports: XAU, XAU-24K, XAU-18K, XAU-21K, XAG, XPT, XPD
 */
function resolveCommodity(ticker: string): CommodityInfo | null {
  const upper = ticker.toUpperCase();

  // Check for gold karat variants: XAU-18K, XAU-21K, etc.
  const karatMatch = upper.match(/^XAU-(\d+K)$/);
  if (karatMatch) {
    const karat = karatMatch[1];
    const purity = GOLD_KARAT_PURITY[karat];
    if (purity !== undefined) {
      return {
        apiSymbol: 'XAU',
        name: `Gold (${karat})`,
        gramsPerOz: 31.1035,
        purity,
      };
    }
    return null;
  }

  // Check base commodities (XAU = 24K pure, XAG, XPT, XPD)
  const base = BASE_COMMODITIES[upper];
  if (base) {
    return {
      apiSymbol: upper,
      name: base.name,
      gramsPerOz: base.gramsPerOz,
      purity: 1.0,
    };
  }

  return null;
}

/**
 * Check if a ticker is a commodity (uses different API endpoint).
 */
export function isCommodityTicker(ticker: string): boolean {
  return resolveCommodity(ticker.toUpperCase()) !== null;
}

/**
 * Fetches commodity prices (gold, silver, etc.) from Alpha Vantage
 * using the CURRENCY_EXCHANGE_RATE endpoint.
 * Returns price per GRAM in USD.
 */
export async function fetchCommodityPrice(
  ticker: string,
  apiKey: string
): Promise<PriceCacheEntry | null> {
  try {
    const commodity = resolveCommodity(ticker.toUpperCase());
    if (!commodity) {
      console.error(`[PriceService] Unknown commodity ticker "${ticker}"`);
      return null;
    }

    const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${commodity.apiSymbol}&to_currency=USD&apikey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[PriceService] HTTP ${response.status} for ${ticker}`);
      return null;
    }

    const data = await response.json();

    // Alpha Vantage uses different error fields depending on the issue
    if (data['Note']) {
      console.warn('[PriceService] API rate limit reached:', data['Note']);
      return null;
    }

    if (data['Information']) {
      console.warn('[PriceService] API info/limit:', data['Information']);
      return null;
    }

    if (data['Error Message']) {
      console.error(`[PriceService] Invalid commodity "${ticker}":`, data['Error Message']);
      return null;
    }

    console.log(`[PriceService] Raw response for ${ticker}:`, JSON.stringify(data));

    const exchangeRate = data['Realtime Currency Exchange Rate'];
    if (!exchangeRate || !exchangeRate['5. Exchange Rate']) {
      console.warn(`[PriceService] No price data for commodity "${ticker}"`);
      return null;
    }

    const pricePerOz = parseFloat(exchangeRate['5. Exchange Rate']);
    if (isNaN(pricePerOz)) {
      console.warn(`[PriceService] Invalid price for "${ticker}":`, exchangeRate['5. Exchange Rate']);
      return null;
    }

    // Convert from per troy ounce to per gram, then apply purity
    const pricePerGram = (pricePerOz / commodity.gramsPerOz) * commodity.purity;

    return {
      price: pricePerGram,
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
      source: 'Alpha Vantage',
    };
  } catch (error) {
    console.error(`[PriceService] Failed to fetch commodity price for "${ticker}":`, error);
    return null;
  }
}

/**
 * Fetches stock/ETF prices from Alpha Vantage.
 * Free tier: 25 API calls/day.
 */
export async function fetchStockPrice(
  ticker: string,
  apiKey: string
): Promise<PriceCacheEntry | null> {
  // Route commodity tickers to the commodity endpoint
  if (isCommodityTicker(ticker)) {
    return fetchCommodityPrice(ticker, apiKey);
  }

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

  // Group commodity tickers by their base API symbol to avoid duplicate calls.
  // e.g. XAU-24K and XAU-18K both query XAU, so we only call the API once.
  const commodityGroups = new Map<string, string[]>(); // apiSymbol -> [ticker1, ticker2]
  const regularTickers: string[] = [];

  for (const ticker of tickers) {
    const commodity = resolveCommodity(ticker.toUpperCase());
    if (commodity) {
      const group = commodityGroups.get(commodity.apiSymbol) || [];
      group.push(ticker);
      commodityGroups.set(commodity.apiSymbol, group);
    } else {
      regularTickers.push(ticker);
    }
  }

  // Process commodity groups first — one API call per base symbol
  // then derive all karat variants locally (no extra API calls)
  let callIndex = 0;
  const totalCalls = commodityGroups.size + regularTickers.length;

  for (const [apiSymbol, groupTickers] of commodityGroups) {
    onProgress?.(groupTickers[0], callIndex, totalCalls);
    callIndex++;

    // Make ONE API call for the base commodity (e.g. XAU)
    try {
      const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${apiSymbol}&to_currency=USD&apikey=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      const data = await response.json();

      console.log(`[PriceService] Commodity batch ${apiSymbol} response:`, JSON.stringify(data));

      // Check for rate limit / info messages
      if (data['Note'] || data['Information']) {
        console.warn(`[PriceService] API limit for ${apiSymbol}:`, data['Note'] || data['Information']);
      }

      const exchangeRate = data['Realtime Currency Exchange Rate'];
      if (exchangeRate && exchangeRate['5. Exchange Rate']) {
        const pricePerOz = parseFloat(exchangeRate['5. Exchange Rate']);

        if (!isNaN(pricePerOz)) {
          // Derive price for each variant (24K, 18K, etc.) from the same raw price
          for (const ticker of groupTickers) {
            const commodity = resolveCommodity(ticker.toUpperCase())!;
            const pricePerGram = (pricePerOz / commodity.gramsPerOz) * commodity.purity;
            results[ticker] = {
              price: pricePerGram,
              currency: 'USD',
              lastUpdated: new Date().toISOString(),
              source: 'Alpha Vantage',
            };
          }
        }
      }
    } catch (error) {
      console.error(`[PriceService] Failed to fetch commodity ${apiSymbol}:`, error);
    }

    if (callIndex < totalCalls) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  // Process regular stock/ETF tickers
  for (const ticker of regularTickers) {
    onProgress?.(ticker, callIndex, totalCalls);
    callIndex++;

    const entry = await fetchStockPrice(ticker, apiKey);
    if (entry) {
      results[ticker] = entry;
    }

    if (callIndex < totalCalls) {
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
