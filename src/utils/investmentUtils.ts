import { InvestmentLot, Position, PriceCache } from '../types';

/**
 * Groups individual investment lots into Position views.
 * Positions are computed/derived and never stored.
 */
export function groupLotsIntoPositions(
  lots: InvestmentLot[],
  priceCache?: PriceCache
): Position[] {
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
    const totalQuantity = sortedLots.reduce((sum, lot) => sum + (Number(lot.quantity) || 0), 0);
    const totalInvested = sortedLots.reduce(
      (sum, lot) => sum + (Number(lot.quantity) || 0) * (Number(lot.pricePerUnit) || 0),
      0
    );
    const avgCostBasis = totalQuantity > 0 ? totalInvested / totalQuantity : 0;

    // Position uses manual valuation if any lot does
    const useManualValuation = sortedLots.some((lot) => lot.useManualValuation);

    let currentPricePerUnit: number | undefined;
    let currentValue: number | undefined;

    if (useManualValuation) {
      // Sum manual values; fall back to cost basis for lots without manual value
      const manualTotal = sortedLots.reduce((sum, lot) => {
        if (lot.manualCurrentValue !== undefined) {
          return sum + (Number(lot.manualCurrentValue) || 0);
        }
        return sum + (Number(lot.quantity) || 0) * (Number(lot.pricePerUnit) || 0);
      }, 0);
      currentValue = manualTotal;
      currentPricePerUnit =
        totalQuantity > 0 ? manualTotal / totalQuantity : undefined;
    } else if (firstLot.ticker && priceCache?.[firstLot.ticker]) {
      currentPricePerUnit = priceCache[firstLot.ticker].price;
      currentValue = currentPricePerUnit * totalQuantity;
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

/** Get total invested amount across all lots */
export function getTotalInvested(lots: InvestmentLot[]): number {
  return lots.reduce((sum, lot) => sum + (Number(lot.quantity) || 0) * (Number(lot.pricePerUnit) || 0), 0);
}

/** Get total current value across all positions */
export function getTotalCurrentValue(
  lots: InvestmentLot[],
  priceCache?: PriceCache
): number {
  const positions = groupLotsIntoPositions(lots, priceCache);
  return positions.reduce(
    (sum, pos) => sum + (pos.currentValue ?? pos.totalInvested),
    0
  );
}
