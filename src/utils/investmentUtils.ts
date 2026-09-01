import { InvestmentLot, Position, PriceCache } from '../types';

const DEFAULT_USD_TO_SAR = 3.75;

/** Fractional-share quantities never land exactly on zero — treat this as closed */
const EPSILON = 1e-8;

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

    // Walk lots chronologically, keeping a running average cost basis.
    // A sell removes basis at the average cost at that moment; the difference
    // between proceeds and basis removed is the realized return.
    let quantity = 0;        // units still held
    let costBasis = 0;       // cost of the units still held (display currency)
    let realizedReturn = 0;
    let totalProceeds = 0;
    let totalCostSold = 0;
    let boughtQuantity = 0;  // gross units bought (for manual valuation)

    for (const lot of sortedLots) {
      const qty = Number(lot.quantity) || 0;
      const price = Number(lot.pricePerUnit) || 0;
      const lotRate = getLotToSarRate(lot, rate, currency);
      const amount = qty * price * lotRate;

      if (lot.type === 'sell') {
        const avg = quantity > EPSILON ? costBasis / quantity : 0;
        const basisSold = avg * qty;
        realizedReturn += amount - basisSold;
        totalProceeds += amount;
        totalCostSold += basisSold;
        costBasis -= basisSold;
        quantity -= qty;
      } else {
        costBasis += amount;
        quantity += qty;
        boughtQuantity += qty;
      }
    }

    // Guard against float drift and over-sells
    const isClosed = quantity <= EPSILON;
    const totalQuantity = isClosed ? 0 : quantity;
    const totalInvested = isClosed ? 0 : costBasis;
    const avgCostBasis = totalQuantity > 0 ? totalInvested / totalQuantity : 0;

    // Position uses manual valuation if any lot does
    const useManualValuation = sortedLots.some((lot) => lot.useManualValuation);

    let currentPricePerUnit: number | undefined;
    let currentValue: number | undefined;

    if (useManualValuation) {
      // Manual values are recorded per purchase lot, so derive a per-unit value
      // from the buys and apply it to whatever quantity is still held.
      const manualTotal = sortedLots.reduce((sum, lot) => {
        if (lot.type === 'sell') return sum;
        const lotRate = getLotToSarRate(lot, rate, currency);
        if (lot.manualCurrentValue !== undefined) {
          return sum + (Number(lot.manualCurrentValue) || 0) * lotRate;
        }
        return sum + (Number(lot.quantity) || 0) * (Number(lot.pricePerUnit) || 0) * lotRate;
      }, 0);
      currentPricePerUnit =
        boughtQuantity > 0 ? manualTotal / boughtQuantity : undefined;
      currentValue =
        currentPricePerUnit !== undefined ? currentPricePerUnit * totalQuantity : undefined;
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

    // A closed position has no unrealized leg — its total return is what it realized
    const totalReturn = isClosed
      ? realizedReturn
      : returnAmount !== undefined
        ? realizedReturn + returnAmount
        : undefined;

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
      realizedReturn,
      totalProceeds,
      totalCostSold,
      totalReturn,
      isClosed,
      lots: sortedLots,
      useManualValuation,
    });
  }

  // Sort positions by total invested, descending
  return positions.sort((a, b) => b.totalInvested - a.totalInvested);
}

/** Positions still held — the ones that count towards the portfolio */
export function getOpenPositions(positions: Position[]): Position[] {
  return positions.filter((p) => !p.isClosed);
}

/** Fully sold positions, most recently closed first */
export function getClosedPositions(positions: Position[]): Position[] {
  return positions
    .filter((p) => p.isClosed)
    .sort((a, b) => getLastSaleTime(b) - getLastSaleTime(a));
}

/** Timestamp of the most recent sell lot (0 if there is none) */
export function getLastSaleTime(position: Position): number {
  let latest = 0;
  for (const lot of position.lots) {
    if (lot.type === 'sell') {
      latest = Math.max(latest, new Date(lot.date).getTime());
    }
  }
  return latest;
}

/**
 * Portfolio-level totals. Open positions drive invested/current value;
 * realized returns come from every position, open or closed.
 */
export function getPortfolioTotals(positions: Position[]) {
  const open = getOpenPositions(positions);
  const totalInvested = open.reduce((s, p) => s + p.totalInvested, 0);
  const totalCurrentValue = open.reduce((s, p) => s + (p.currentValue ?? p.totalInvested), 0);
  const unrealizedReturn = totalCurrentValue - totalInvested;
  const realizedReturn = positions.reduce((s, p) => s + p.realizedReturn, 0);
  const unrealizedReturnPct = totalInvested > 0 ? (unrealizedReturn / totalInvested) * 100 : 0;
  return {
    totalInvested,
    totalCurrentValue,
    unrealizedReturn,
    unrealizedReturnPct,
    realizedReturn,
    totalReturn: unrealizedReturn + realizedReturn,
  };
}

/** Get open cost basis across all lots (in display currency) */
export function getTotalInvested(lots: InvestmentLot[], usdToSarRate?: number, displayCurrency?: string): number {
  const positions = groupLotsIntoPositions(lots, undefined, usdToSarRate, displayCurrency);
  return getOpenPositions(positions).reduce((sum, pos) => sum + pos.totalInvested, 0);
}

/** Get total current value across open positions (in display currency) */
export function getTotalCurrentValue(
  lots: InvestmentLot[],
  priceCache?: PriceCache,
  usdToSarRate?: number,
  displayCurrency?: string
): number {
  const positions = groupLotsIntoPositions(lots, priceCache, usdToSarRate, displayCurrency);
  return getOpenPositions(positions).reduce(
    (sum, pos) => sum + (pos.currentValue ?? pos.totalInvested),
    0
  );
}
