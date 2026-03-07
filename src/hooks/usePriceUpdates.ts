import { useState, useCallback, useRef } from 'react';
import { InvestmentLot, PriceCache } from '../types';
import { fetchMultiplePrices, isPriceStale } from '../services/priceService';

interface PriceUpdateState {
  isUpdating: boolean;
  progress: string;
  lastError: string | null;
  lastRefreshed: string | null;
}

/**
 * Hook for managing automatic and manual price updates.
 * Uses Alpha Vantage API to fetch stock/ETF prices.
 */
export function usePriceUpdates(
  investments: InvestmentLot[],
  priceCache: PriceCache | undefined,
  apiKey: string | undefined,
  onUpdateCache: (cache: PriceCache) => void
) {
  const [updateState, setUpdateState] = useState<PriceUpdateState>({
    isUpdating: false,
    progress: '',
    lastError: null,
    lastRefreshed: null,
  });

  // Prevent concurrent updates
  const isUpdatingRef = useRef(false);

  /**
   * Get list of tickers that need price updates.
   * Only includes positions with tickers, not using manual valuation,
   * and whose cached prices are stale.
   */
  const getStaleTickers = useCallback(
    (forceAll: boolean = false): string[] => {
      const tickerSet = new Set<string>();

      for (const lot of investments) {
        if (
          lot.ticker &&
          !lot.useManualValuation
        ) {
          // If forcing refresh or price is stale, include it
          if (forceAll || isPriceStale(priceCache?.[lot.ticker], 6)) {
            tickerSet.add(lot.ticker.toUpperCase());
          }
        }
      }

      return Array.from(tickerSet);
    },
    [investments, priceCache]
  );

  /**
   * Refresh prices for all stale tickers (or all if forceAll=true).
   */
  const refreshPrices = useCallback(
    async (forceAll: boolean = false) => {
      if (!apiKey) {
        setUpdateState((prev) => ({
          ...prev,
          lastError: 'No API key configured. Add your Alpha Vantage key in Settings.',
        }));
        return;
      }

      if (isUpdatingRef.current) return;

      const tickers = getStaleTickers(forceAll);
      if (tickers.length === 0) {
        setUpdateState((prev) => ({
          ...prev,
          progress: '',
          lastError: null,
          lastRefreshed: new Date().toLocaleTimeString(),
        }));
        return;
      }

      isUpdatingRef.current = true;
      setUpdateState({
        isUpdating: true,
        progress: `Fetching prices (0/${tickers.length})...`,
        lastError: null,
        lastRefreshed: null,
      });

      try {
        const newPrices = await fetchMultiplePrices(
          tickers,
          apiKey,
          (_ticker, index, total) => {
            setUpdateState((prev) => ({
              ...prev,
              progress: `Fetching prices (${index + 1}/${total})...`,
            }));
          }
        );

        // Merge new prices with existing cache
        const mergedCache: PriceCache = {
          ...(priceCache || {}),
          ...newPrices,
        };

        onUpdateCache(mergedCache);

        const fetchedCount = Object.keys(newPrices).length;
        const failedCount = tickers.length - fetchedCount;

        setUpdateState({
          isUpdating: false,
          progress: '',
          lastError: failedCount > 0
            ? `Updated ${fetchedCount}/${tickers.length} prices. ${failedCount} failed.`
            : null,
          lastRefreshed: new Date().toLocaleTimeString(),
        });
      } catch (error) {
        console.error('[usePriceUpdates] Error:', error);
        setUpdateState({
          isUpdating: false,
          progress: '',
          lastError: 'Failed to fetch prices. Check your API key and try again.',
          lastRefreshed: null,
        });
      } finally {
        isUpdatingRef.current = false;
      }
    },
    [apiKey, getStaleTickers, priceCache, onUpdateCache]
  );

  /**
   * Number of tickers that have stale or missing prices.
   */
  const staleTickers = getStaleTickers(false);
  const hasStaleData = staleTickers.length > 0;

  /**
   * Whether any investment has a ticker configured for auto pricing.
   */
  const hasAutoTickers = investments.some(
    (lot) => lot.ticker && !lot.useManualValuation
  );

  return {
    ...updateState,
    refreshPrices,
    hasStaleData,
    hasAutoTickers,
    staleTickers,
  };
}
