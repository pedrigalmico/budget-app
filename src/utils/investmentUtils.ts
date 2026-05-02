import { InvestmentLot, Position, PriceCache } from '../types';

const DEFAULT_USD_TO_SAR = 3.75;

/**
 * Get the conversion rate from a lot's purchase currency to SAR.
 * If lot was purchased in USD, multiply by usdToSarRate.
 * If lot was purchased in SAR (or no currency specified), no conversion needed.
 */
function getLotToSarRate(lot: InvestmentLot, usdToSarRate: number, displayCurrency: string): number {
  const purchaseCurrency = lot.purchaseCurrency || displayCurrency;
  if (purchaseCurrency === 'USD' && displayCurrency === 'SAR') {
    return usdToSarRate;
  }
  return 1;
}

/**
 * Groups individual investment lots into Position views.
 * Positions are computed/derived and never stored.
 * All monetary values are converted to the display currency (SAR).
 */
export function groupLotsIntoPositions(
  lots: InvestmentLot[],
  priceCache?: PriceCache,
  usdToSarRate?: number,
  displayCurrency?: string
): Position[] {
  const rate = usdToSarRate || DEFAULT_USD_TO_SAR;
  const currency = displayCurrency || 'SAR';
  const grouped = new Map<string, InvestmentLot[]>();

  for (const lot of lots) {
    const existing = grouped.get(lot.positionKey) || [];
    existing.push(lot);
    grouped.set(lot.positionKey, existing);
  }

  const positions: Position[] = [];

  for (const [positionKey, positionLots] of grouped) {
    const sortedLots = [...positionLots].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const firstLot = sortedLots[0];

    // Calculate totals converting each lot's currency to display currency
    const totalQuantity = sortedLots.reduce((sum, lot) => sum + (Number(lot.quantity) || 0), 0);
    const totalInvested = sortedLots.reduce((sum, lot) => {
      const qty = Number(lot.quantity) || 0;
      const price = Number(lot.pricePerUnit) || 0;
      const lotRate = getLotToSarRate(lot, rate, currency);
      return sum + qty * price * lotRate;
    }, 0);
    const avgCostBasis = totalQuantity > 0 ? totalInvested / totalQuantity : 0;

    // Position uses manual valuation if any lot does
    const useManualValuation = sortedLots.some((lot) => lot.useManualValuation);

    let currentPricePerUnit: number | undefined;
    let currentValue: number | undefined;

    if (useManualValuation) {
      // Sum manual values; fall back to cost basis for lots without manual value
      const manualTotal = sortedLots.reduce((sum, lot) => {
        const lotRate = getLotToSarRate(lot, rate, currency);
        if (lot.manualCurrentValue !== undefined) {
          return sum + (Number(lot.manualCurrentValue) || 0) * lotRate;
        }
        return sum + (Number(lot.quantity) || 0) * (Number(lot.pricePerUnit) || 0) * lotRate;
      }, 0);
      currentValue = manualTotal;
      currentPricePerUnit =
        totalQuantity > 0 ? manualTotal / totalQuantity : undefined;
    } else {
      // Look up price cache: prefer ticker (API/auto), fall back to positionKey (manual)
      const cacheKey = (firstLot.ticker && priceCache?.[firstLot.ticker])
        ? firstLot.ticker
        : positionKey;
      const cached = priceCache?.[cacheKey];
      if (cached) {
        const cachedCurrency = cached.currency || 'USD';
        // Manual prices stored in display currency need no conversion
        const apiRate = (cachedCurrency === 'USD' && currency === 'SAR') ? rate : 1;
        currentPricePerUnit = cached.price * apiRate;
        currentValue = currentPricePerUnit * totalQuantity;
      }
    }

    let returnAmount: number | undefined;
    let returnPercentage: number | undefined;

    if (currentValue !== undefined) {
      returnAmount = currentValue - totalInvested;
      returnPercentage =
        totalInvested > 0 ? (returnAmount / totalInvested) * 100 : 0;
    }

    positions.push({
      positionKey,
      name: firstLot.name,
      ticker: firstLot.ticker,
      category: firstLot.category,
      unitType: firstLot.unitType,
      totalQuantity,
      avgCostBasis,
      totalInvested,
      currentPricePerUnit,
      currentValue,
      returnAmount,
      returnPercentage,
      lots: sortedLots,
      useManualValuation,
    });
  }

  // Sort positions by total invested, descending
  return positions.sort((a, b) => b.totalInvested - a.totalInvested);
}

/** Get total invested amount across all lots (in display currency) */
export function getTotalInvested(lots: InvestmentLot[], usdToSarRate?: number, displayCurrency?: string): number {
  const rate = usdToSarRate || DEFAULT_USD_TO_SAR;
  const currency = displayCurrency || 'SAR';
  return lots.reduce((sum, lot) => {
    const qty = Number(lot.quantity) || 0;
    const price = Number(lot.pricePerUnit) || 0;
    const lotRate = getLotToSarRate(lot, rate, currency);
    return sum + qty * price * lotRate;
  }, 0);
}

/** Get total current value across all positions (in display currency) */
export function getTotalCurrentValue(
  lots: InvestmentLot[],
  priceCache?: PriceCache,
  usdToSarRate?: number,
  displayCurrency?: string
): number {
  const positions = groupLotsIntoPositions(lots, priceCache, usdToSarRate, displayCurrency);
  return positions.reduce(
    (sum, pos) => sum + (pos.currentValue ?? pos.totalInvested),
    0
  );
}
