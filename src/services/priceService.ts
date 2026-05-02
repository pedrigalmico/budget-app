import { PriceCacheEntry } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRAMS_PER_TROY_OZ = 31.1035;

/** Gold karat → purity multiplier */
const GOLD_KARAT_PURITY: Record<string, number> = {
  '24K': 24 / 24, // 1.000 — pure gold
  '22K': 22 / 24, // 0.917
  '21K': 21 / 24, // 0.875
  '18K': 18 / 24, // 0.750
  '14K': 14 / 24, // 0.583
};

/** Base commodity API symbols → display info */
const BASE_COMMODITIES: Record<string, { name: string }> = {
  XAU: { name: 'Gold (24K)' },
  XAG: { name: 'Silver' },
  XPT: { name: 'Platinum' },
  XPD: { name: 'Palladium' },
};

interface CommodityInfo {
  apiSymbol: string; // e.g. 'XAU'
  name: string;
  purity: number; // 1.0 for 24K, 0.75 for 18K, etc.
}

// ---------------------------------------------------------------------------
// Ticker resolution
// ---------------------------------------------------------------------------

function resolveCommodity(ticker: string): CommodityInfo | null {
  const upper = ticker.toUpperCase();

  // Gold karat variants: XAU-18K, XAU-21K, XAU-24K …
  const karatMatch = upper.match(/^XAU-(\d+K)$/);
  if (karatMatch) {
    const karat = karatMatch[1];
    const purity = GOLD_KARAT_PURITY[karat];
    if (purity !== undefined) {
      return { apiSymbol: 'XAU', name: `Gold (${karat})`, purity };
    }
    return null;
  }

  // Base commodities: XAU (= 24K), XAG, XPT, XPD
  const base = BASE_COMMODITIES[upper];
  if (base) {
    return { apiSymbol: upper, name: base.name, purity: 1.0 };
  }

  return null;
}

export function isCommodityTicker(ticker: string): boolean {
  return resolveCommodity(ticker.toUpperCase()) !== null;
}

// ---------------------------------------------------------------------------
// Gold / Commodity price sources (ordered by priority — no API key needed)
// ---------------------------------------------------------------------------

/**
 * Source 1 — metals.live  (free, no key, purpose-built for metals)
 * Returns spot price per troy oz in USD.
 */
const METALS_LIVE_KEY_MAP: Record<string, string> = {
  XAU: 'gold',
  XAG: 'silver',
  XPT: 'platinum',
  XPD: 'palladium',
};

async function tryMetalsLive(apiSymbol: string): Promise<number | null> {
  const metalKey = METALS_LIVE_KEY_MAP[apiSymbol];
  if (!metalKey) return null;
  try {
    const res = await fetch('https://api.metals.live/v1/spot', { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    // Response: array of single-key objects [{ gold: 3050.12 }, { silver: 25.45 }, …]
    if (!Array.isArray(data)) return null;
    for (const entry of data) {
      if (typeof entry[metalKey] === 'number') return entry[metalKey];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Source 2 — Yahoo Finance (unofficial, free, no key, very reliable)
 * GC=F is the front-month gold futures contract — tracks spot closely.
 * Returns price in USD.
 */
async function tryYahooFinance(apiSymbol: string): Promise<number | null> {
  // Map commodity symbols to Yahoo Finance tickers
  const yahooMap: Record<string, string> = {
    XAU: 'GC=F',   // Gold futures
    XAG: 'SI=F',   // Silver futures
    XPT: 'PL=F',   // Platinum futures
    XPD: 'PA=F',   // Palladium futures
  };
  const yahooTicker = yahooMap[apiSymbol];
  if (!yahooTicker) return null;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === 'number' ? price : null;
  } catch {
    return null;
  }
}

/**
 * Source 3 — Frankfurt (open.er-api.com via XAU/USD rate)
 * XAUUSD from ExchangeRate-API — free tier, no key for open endpoints.
 * Returns USD per troy oz.
 */
async function tryExchangeRateApi(apiSymbol: string): Promise<number | null> {
  if (apiSymbol !== 'XAU') return null; // Only gold supported here
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/XAU', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Response has rates relative to XAU — we want USD per 1 XAU (i.e. 1 troy oz)
    const usdPerOz = data?.rates?.USD;
    return typeof usdPerOz === 'number' ? usdPerOz : null;
  } catch {
    return null;
  }
}

/**
 * Source 4 — Alpha Vantage (as last resort for commodities; kept for stocks)
 * CURRENCY_EXCHANGE_RATE endpoint — real-time spot.
 */
async function tryAlphaVantageExchangeRate(apiSymbol: string, apiKey: string): Promise<number | null> {
  if (!apiKey) return null;
  try {
    const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${apiSymbol}&to_currency=USD&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data['Note'] || data['Information'] || data['Error Message']) return null;
    const rate = data['Realtime Currency Exchange Rate']?.['5. Exchange Rate'];
    const price = parseFloat(rate);
    return isNaN(price) ? null : price;
  } catch {
    return null;
  }
}

async function tryAlphaVantageDaily(apiSymbol: string, apiKey: string): Promise<number | null> {
  if (!apiKey) return null;
  try {
    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${apiSymbol}&to_symbol=USD&outputsize=compact&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data['Note'] || data['Information'] || data['Error Message']) return null;
    const timeSeries = data['Time Series FX (Daily)'];
    if (!timeSeries) return null;
    const latestDate = Object.keys(timeSeries).sort().reverse()[0];
    const price = parseFloat(timeSeries[latestDate]?.['4. close']);
    return isNaN(price) ? null : price;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Core commodity fetch — tries sources in priority order
// ---------------------------------------------------------------------------

/**
 * Fetch the gold/silver/metals spot price per troy oz in USD.
 * Priority: metals.live → Yahoo Finance → ExchangeRate-API → Alpha Vantage
 * Returns { pricePerOz, source } or null if all sources fail.
 */
async function fetchSpotPricePerOz(
  apiSymbol: string,
  apiKey?: string,
): Promise<{ pricePerOz: number; source: string } | null> {
  // 1. metals.live — best free source for metals
  const metalLive = await tryMetalsLive(apiSymbol);
  if (metalLive !== null) return { pricePerOz: metalLive, source: 'metals.live' };

  // 2. Yahoo Finance (futures proxy)
  const yahoo = await tryYahooFinance(apiSymbol);
  if (yahoo !== null) return { pricePerOz: yahoo, source: 'Yahoo Finance' };

  // 3. ExchangeRate-API (gold only)
  const erApi = await tryExchangeRateApi(apiSymbol);
  if (erApi !== null) return { pricePerOz: erApi, source: 'ExchangeRate-API' };

  // 4. Alpha Vantage (last resort — has daily rate limits)
  if (apiKey) {
    const avRT = await tryAlphaVantageExchangeRate(apiSymbol, apiKey);
    if (avRT !== null) return { pricePerOz: avRT, source: 'Alpha Vantage' };

    const avDaily = await tryAlphaVantageDaily(apiSymbol, apiKey);
    if (avDaily !== null) return { pricePerOz: avDaily, source: 'Alpha Vantage (daily)' };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch price for a commodity ticker (XAU, XAU-18K, XAU-24K, XAG, etc.)
 * Returns price per GRAM in USD, with karat purity already applied.
 */
export async function fetchCommodityPrice(
  ticker: string,
  apiKey?: string,
): Promise<PriceCacheEntry | null> {
  const commodity = resolveCommodity(ticker.toUpperCase());
  if (!commodity) {
    console.error(`[PriceService] Unknown commodity ticker "${ticker}"`);
    return null;
  }

  const result = await fetchSpotPricePerOz(commodity.apiSymbol, apiKey);
  if (!result) {
    console.error(`[PriceService] All price sources failed for "${ticker}"`);
    return null;
  }

  // per gram = (per troy oz / 31.1035) × purity
  const pricePerGram = (result.pricePerOz / GRAMS_PER_TROY_OZ) * commodity.purity;

  return {
    price: pricePerGram,
    currency: 'USD',
    lastUpdated: new Date().toISOString(),
    source: result.source,
  };
}

/**
 * Fetch price for a stock or ETF via Alpha Vantage GLOBAL_QUOTE.
 * Commodity tickers are automatically routed to fetchCommodityPrice.
 */
export async function fetchStockPrice(
  ticker: string,
  apiKey: string,
): Promise<PriceCacheEntry | null> {
  if (isCommodityTicker(ticker)) {
    return fetchCommodityPrice(ticker, apiKey);
  }

  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!res.ok) {
      console.error(`[PriceService] HTTP ${res.status} for stock "${ticker}"`);
      return null;
    }

    const data = await res.json();

    if (data['Note']) {
      console.warn('[PriceService] Rate limited by Alpha Vantage:', data['Note']);
      return null;
    }
    if (data['Information']) {
      console.warn('[PriceService] Alpha Vantage info:', data['Information']);
      return null;
    }
    if (data['Error Message']) {
      console.error(`[PriceService] Invalid ticker "${ticker}":`, data['Error Message']);
      return null;
    }

    const price = parseFloat(data['Global Quote']?.['05. price']);
    if (isNaN(price)) {
      console.warn(`[PriceService] No price data for stock "${ticker}"`);
      return null;
    }

    return {
      price,
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
      source: 'Alpha Vantage',
    };
  } catch (err) {
    console.error(`[PriceService] Failed to fetch stock "${ticker}":`, err);
    return null;
  }
}

/**
 * Fetch prices for multiple tickers with rate-limiting between stock calls.
 * - Commodities: fetched in one batch (one API call per base symbol, all karats derived locally)
 * - Stocks: sequential with 1.5 s delay to respect Alpha Vantage free limits
 */
export async function fetchMultiplePrices(
  tickers: string[],
  apiKey: string,
  onProgress?: (ticker: string, index: number, total: number) => void,
): Promise<Record<string, PriceCacheEntry>> {
  const results: Record<string, PriceCacheEntry> = {};

  // Group commodity tickers by their base symbol to make ONE API call per metal
  const commodityGroups = new Map<string, string[]>(); // apiSymbol → [ticker …]
  const stockTickers: string[] = [];

  for (const ticker of tickers) {
    const commodity = resolveCommodity(ticker.toUpperCase());
    if (commodity) {
      const group = commodityGroups.get(commodity.apiSymbol) ?? [];
      group.push(ticker);
      commodityGroups.set(commodity.apiSymbol, group);
    } else {
      stockTickers.push(ticker);
    }
  }

  let callIndex = 0;
  const totalCalls = commodityGroups.size + stockTickers.length;

  // --- Commodities (no API key needed, no rate-limiting required) ---
  for (const [apiSymbol, groupTickers] of commodityGroups) {
    onProgress?.(groupTickers[0], callIndex++, totalCalls);

    const result = await fetchSpotPricePerOz(apiSymbol, apiKey);

    if (result) {
      for (const ticker of groupTickers) {
        const commodity = resolveCommodity(ticker.toUpperCase())!;
        const pricePerGram = (result.pricePerOz / GRAMS_PER_TROY_OZ) * commodity.purity;
        results[ticker] = {
          price: pricePerGram,
          currency: 'USD',
          lastUpdated: new Date().toISOString(),
          source: result.source,
        };
      }
    } else {
      console.error(`[PriceService] All sources failed for commodity batch "${apiSymbol}"`);
    }
  }

  // --- Stocks (Alpha Vantage, throttled) ---
  for (const ticker of stockTickers) {
    onProgress?.(ticker, callIndex++, totalCalls);

    const entry = await fetchStockPrice(ticker, apiKey);
    if (entry) results[ticker] = entry;

    if (callIndex < totalCalls) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  return results;
}

/**
 * Returns true if a cached price entry is older than maxAgeHours.
 */
export function isPriceStale(entry: PriceCacheEntry | undefined, maxAgeHours = 6): boolean {
  if (!entry) return true;
  const ageMs = Date.now() - new Date(entry.lastUpdated).getTime();
  return ageMs > maxAgeHours * 3_600_000;
}
