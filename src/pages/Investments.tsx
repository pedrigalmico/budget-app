import { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../hooks/useAppState';
import { usePriceUpdates } from '../hooks/usePriceUpdates';
import { InvestmentLot, Position } from '../types';
import { INVESTMENT_CATEGORIES, UNIT_TYPES } from '../config/categories';
import { groupLotsIntoPositions } from '../utils/investmentUtils';
import { FaPlus, FaEdit, FaTrash, FaChevronDown, FaChevronUp, FaTimes, FaSyncAlt } from 'react-icons/fa';

export default function Investments() {
  const {
    state, addInvestmentLot, updateInvestmentLot, deleteInvestmentLot,
    deletePosition, updatePriceCache, formatMoney
  } = useAppState();

  const usdToSarRate = state.settings.usdToSarRate || 3.75;
  const displayCurrency = state.settings.currency;

  // Price update hook
  const {
    isUpdating, progress, lastError, lastRefreshed,
    refreshPrices, hasStaleData, hasAutoTickers
  } = usePriceUpdates(
    state.investments,
    state.priceCache,
    state.settings.alphaVantageApiKey,
    updatePriceCache
  );

  // Auto-refresh prices on mount if data is stale
  useEffect(() => {
    if (hasStaleData && state.settings.alphaVantageApiKey) {
      refreshPrices(false);
    }
  }, []); // Only on mount

  const [showForm, setShowForm] = useState(false);
  const [editingLot, setEditingLot] = useState<InvestmentLot | null>(null);
  const [expandedPosition, setExpandedPosition] = useState<string | null>(null);
  const [selectedPositionKey, setSelectedPositionKey] = useState<string>('new');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [useManualVal, setUseManualVal] = useState(false);
  const [purchaseCurrency, setPurchaseCurrency] = useState<string>('USD');

  // Form fields for auto-calculation
  const [amountInvested, setAmountInvested] = useState<string>('');
  const [pricePerUnit, setPricePerUnit] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');

  // Compute positions from lots
  const positions = useMemo(() => {
    return groupLotsIntoPositions(state.investments, state.priceCache, usdToSarRate, displayCurrency);
  }, [state.investments, state.priceCache, usdToSarRate, displayCurrency]);

  // Portfolio totals
  const portfolioTotals = useMemo(() => {
    const totalInvested = positions.reduce((sum, pos) => sum + pos.totalInvested, 0);
    const totalCurrentValue = positions.reduce(
      (sum, pos) => sum + (pos.currentValue ?? pos.totalInvested), 0
    );
    const totalReturn = totalCurrentValue - totalInvested;
    const totalReturnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
    return { totalInvested, totalCurrentValue, totalReturn, totalReturnPct };
  }, [positions]);

  // Auto-calculate quantity when amount or price changes
  useEffect(() => {
    const amt = parseFloat(amountInvested);
    const price = parseFloat(pricePerUnit);
    if (amt > 0 && price > 0) {
      setQuantity((amt / price).toFixed(6).replace(/\.?0+$/, ''));
    }
  }, [amountInvested, pricePerUnit]);

  // Default currency based on category
  useEffect(() => {
    const usdCategories = ['Stocks', 'ETFs', 'Cryptocurrency', 'Mutual Funds'];
    if (usdCategories.includes(selectedCategory)) {
      setPurchaseCurrency('USD');
    } else {
      setPurchaseCurrency(displayCurrency);
    }
  }, [selectedCategory, displayCurrency]);

  // Open form to add a lot to an existing position
  const handleAddToPosition = (position: Position) => {
    setEditingLot(null);
    setSelectedPositionKey(position.positionKey);
    setSelectedCategory(position.category);
    setUseManualVal(position.useManualValuation);
    resetFormFields();
    setShowForm(true);
  };

  // Open form for a new position
  const handleNewPosition = () => {
    setEditingLot(null);
    setSelectedPositionKey('new');
    setSelectedCategory('');
    setUseManualVal(false);
    resetFormFields();
    setShowForm(true);
  };

  // Open form to edit an existing lot
  const handleEditLot = (lot: InvestmentLot) => {
    setEditingLot(lot);
    setSelectedPositionKey(lot.positionKey);
    setSelectedCategory(lot.category);
    setUseManualVal(lot.useManualValuation || false);
    setPurchaseCurrency(lot.purchaseCurrency || displayCurrency);
    setPricePerUnit(String(lot.pricePerUnit));
    setQuantity(String(lot.quantity));
    setAmountInvested(String((lot.quantity * lot.pricePerUnit).toFixed(2)));
    setShowForm(true);
  };

  const resetFormFields = () => {
    setAmountInvested('');
    setPricePerUnit('');
    setQuantity('');
  };

  const handleDeleteLot = (lotId: string) => {
    if (window.confirm('Delete this purchase lot?')) {
      deleteInvestmentLot(lotId);
    }
  };

  const handleDeletePosition = (positionKey: string) => {
    if (window.confirm('Delete this entire position and all its lots?')) {
      deletePosition(positionKey);
      setExpandedPosition(null);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const isExistingPosition = selectedPositionKey !== 'new';
    const existingPosition = positions.find(p => p.positionKey === selectedPositionKey);

    // When editing a lot, use form values so user can change name/ticker/category
    // When adding to an existing position, inherit from the position
    const category = editingLot
      ? (formData.get('category') as string) || editingLot.category
      : isExistingPosition && existingPosition
        ? existingPosition.category
        : (formData.get('category') as string);

    const name = editingLot
      ? (formData.get('name') as string) || editingLot.name
      : isExistingPosition && existingPosition
        ? existingPosition.name
        : (formData.get('name') as string);

    const ticker = editingLot
      ? ((formData.get('ticker') as string) || undefined)
      : isExistingPosition && existingPosition
        ? existingPosition.ticker
        : ((formData.get('ticker') as string) || undefined);

    const positionKey = isExistingPosition
      ? selectedPositionKey
      : (editingLot?.positionKey || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));

    const unitType = UNIT_TYPES[category] || 'units';

    const manualCurrentValueStr = formData.get('manualCurrentValue') as string;

    const qty = parseFloat(quantity);
    const price = parseFloat(pricePerUnit);

    if (!qty || qty <= 0 || !price || price <= 0) return;

    const lotData: InvestmentLot = {
      id: editingLot?.id || crypto.randomUUID(),
      positionKey,
      name,
      ticker: ticker || undefined,
      category,
      quantity: qty,
      pricePerUnit: price,
      unitType,
      purchaseCurrency: purchaseCurrency,
      date: new Date(formData.get('date') as string).toISOString(),
      notes: (formData.get('notes') as string) || undefined,
      useManualValuation: useManualVal || undefined,
      manualCurrentValue: useManualVal && manualCurrentValueStr
        ? parseFloat(manualCurrentValueStr)
        : undefined,
    };

    if (editingLot) {
      updateInvestmentLot(lotData);
    } else {
      addInvestmentLot(lotData);
    }

    setShowForm(false);
    setEditingLot(null);
    setSelectedPositionKey('new');
    resetFormFields();
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingLot(null);
    setSelectedPositionKey('new');
    resetFormFields();
  };

  const isExistingPosition = selectedPositionKey !== 'new';
  const existingPosition = positions.find(p => p.positionKey === selectedPositionKey);
  const unitLabel = isExistingPosition && existingPosition
    ? existingPosition.unitType
    : (UNIT_TYPES[selectedCategory] || 'units');

  // Helper to format lot values in display currency
  const formatLotValue = (lot: InvestmentLot) => {
    const lotCurrency = lot.purchaseCurrency || displayCurrency;
    const rate = (lotCurrency === 'USD' && displayCurrency === 'SAR') ? usdToSarRate : 1;
    return formatMoney(lot.quantity * lot.pricePerUnit * rate);
  };

  const formatLotPrice = (lot: InvestmentLot) => {
    const lotCurrency = lot.purchaseCurrency || displayCurrency;
    const rate = (lotCurrency === 'USD' && displayCurrency === 'SAR') ? usdToSarRate : 1;
    return formatMoney(lot.pricePerUnit * rate);
  };

  // Show SAR equivalent for USD purchases
  const sarEquivalent = useMemo(() => {
    if (purchaseCurrency !== 'USD' || displayCurrency !== 'SAR') return null;
    const amt = parseFloat(amountInvested);
    if (!amt || amt <= 0) return null;
    return amt * usdToSarRate;
  }, [amountInvested, purchaseCurrency, displayCurrency, usdToSarRate]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Investments</h1>
        <button
          onClick={handleNewPosition}
          className="btn btn-primary flex items-center gap-2"
        >
          <FaPlus /> Add Lot
        </button>
      </div>

      {/* Portfolio Summary */}
      {positions.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-medium text-gray-400">Portfolio Summary</h2>
            {hasAutoTickers && (
              <button
                onClick={() => refreshPrices(true)}
                disabled={isUpdating}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors ${
                  isUpdating
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                }`}
              >
                <FaSyncAlt size={10} className={isUpdating ? 'animate-spin' : ''} />
                {isUpdating ? 'Updating...' : 'Refresh Prices'}
              </button>
            )}
          </div>

          {/* Price update status */}
          {isUpdating && progress && (
            <div className="text-xs text-blue-400 mb-2">{progress}</div>
          )}
          {lastError && (
            <div className="text-xs text-amber-400 mb-2">{lastError}</div>
          )}
          {lastRefreshed && !isUpdating && (
            <div className="text-xs text-gray-500 mb-2">Last updated: {lastRefreshed}</div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Invested</div>
              <div className="font-semibold dark:text-white text-sm">
                {displayCurrency} {formatMoney(portfolioTotals.totalInvested)}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Current</div>
              <div className="font-semibold dark:text-white text-sm">
                {displayCurrency} {formatMoney(portfolioTotals.totalCurrentValue)}
              </div>
            </div>
            <div className={`rounded-lg p-3 ${portfolioTotals.totalReturn >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <div className="text-xs text-gray-400 mb-1">Return</div>
              <div className={`font-semibold text-sm ${portfolioTotals.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {portfolioTotals.totalReturn >= 0 ? '+' : ''}{(portfolioTotals.totalReturnPct ?? 0).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Lot Form */}
      {showForm && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold dark:text-white">
              {editingLot ? 'Edit Lot' : isExistingPosition ? `Add Lot to ${existingPosition?.name}` : 'Add New Investment'}
            </h2>
            <button onClick={closeForm} className="text-gray-400 hover:text-white">
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Position selector (only when creating, not editing) */}
            {!editingLot && (
              <div>
                <label className="block text-sm font-medium mb-1">Position</label>
                <select
                  value={selectedPositionKey}
                  onChange={(e) => {
                    setSelectedPositionKey(e.target.value);
                    const pos = positions.find(p => p.positionKey === e.target.value);
                    if (pos) {
                      setSelectedCategory(pos.category);
                      setUseManualVal(pos.useManualValuation);
                    }
                  }}
                  className="input mt-1"
                >
                  <option value="new">+ Create New Position</option>
                  {positions.map(pos => (
                    <option key={pos.positionKey} value={pos.positionKey}>
                      {pos.name} {pos.ticker ? `(${pos.ticker})` : ''} — {pos.totalQuantity.toFixed(4).replace(/\.?0+$/, '')} {pos.unitType}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Fields for new position or editing */}
            {(!isExistingPosition || editingLot) && (
              <>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium mb-1">Category</label>
                  <select
                    name="category"
                    id="category"
                    required={!isExistingPosition}
                    className="input mt-1"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="" disabled>Select a category</option>
                    {INVESTMENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required={!isExistingPosition}
                    className="input mt-1"
                    placeholder="e.g. Apple Inc., Gold 24k"
                    defaultValue={editingLot?.name}
                  />
                </div>

                <div>
                  <label htmlFor="ticker" className="block text-sm font-medium mb-1">
                    Ticker Symbol <span className="text-gray-500">(optional, for price lookup)</span>
                  </label>
                  <input
                    type="text"
                    name="ticker"
                    id="ticker"
                    className="input mt-1 uppercase"
                    placeholder="e.g. AAPL, NVDA, VOO"
                    defaultValue={editingLot?.ticker}
                  />
                </div>
              </>
            )}

            {/* Purchase Currency */}
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Currency</label>
              <div className="flex gap-2">
                {['USD', 'SAR'].map(cur => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setPurchaseCurrency(cur)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      purchaseCurrency === cur
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Invested + Price Per Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="amountInvested" className="block text-sm font-medium mb-1">
                  Amount Invested ({purchaseCurrency})
                </label>
                <input
                  type="number"
                  id="amountInvested"
                  required
                  min="0"
                  step="any"
                  className="input mt-1"
                  placeholder="e.g. 500"
                  value={amountInvested}
                  onChange={(e) => setAmountInvested(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="pricePerUnit" className="block text-sm font-medium mb-1">
                  Price / {unitLabel.replace(/s$/, '')} ({purchaseCurrency})
                </label>
                <input
                  type="number"
                  id="pricePerUnit"
                  required
                  min="0"
                  step="any"
                  className="input mt-1"
                  placeholder="e.g. 175.50"
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)}
                />
              </div>
            </div>

            {/* Auto-calculated quantity */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Quantity ({unitLabel})</span>
                <span className="text-sm font-medium dark:text-white">
                  {quantity ? `${quantity} ${unitLabel}` : '—'}
                </span>
              </div>
              {sarEquivalent && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">SAR equivalent</span>
                  <span className="text-xs text-blue-400">
                    SAR {formatMoney(sarEquivalent)}
                    <span className="text-gray-600 ml-1">(@ {usdToSarRate})</span>
                  </span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium mb-1">Purchase Date</label>
              <input
                type="date"
                name="date"
                id="date"
                required
                className="input mt-1"
                defaultValue={editingLot?.date
                  ? new Date(editingLot.date).toISOString().split('T')[0]
                  : new Date().toISOString().split('T')[0]
                }
              />
            </div>

            {/* Manual valuation toggle */}
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useManualVal}
                  onChange={(e) => setUseManualVal(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-sm">Manual valuation (no API price lookup)</span>
            </div>

            {useManualVal && (
              <div>
                <label htmlFor="manualCurrentValue" className="block text-sm font-medium mb-1">
                  Current Value ({purchaseCurrency})
                </label>
                <input
                  type="number"
                  name="manualCurrentValue"
                  id="manualCurrentValue"
                  min="0"
                  step="any"
                  className="input mt-1"
                  placeholder="Leave empty to use cost basis"
                  defaultValue={editingLot?.manualCurrentValue}
                />
              </div>
            )}

            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Notes <span className="text-gray-500">(optional)</span>
              </label>
              <textarea
                name="notes"
                id="notes"
                className="input mt-1"
                rows={2}
                defaultValue={editingLot?.notes}
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary flex-1">
                {editingLot ? 'Save Changes' : 'Add Lot'}
              </button>
              <button type="button" onClick={closeForm} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Position Cards */}
      <div className="space-y-4">
        {positions.map(position => (
          <div key={position.positionKey} className="card">
            {/* Position Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg dark:text-white truncate">{position.name}</h3>
                  {position.ticker && (
                    <span className="text-xs font-medium bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full shrink-0">
                      {position.ticker}
                    </span>
                  )}
                </div>
                <div className="text-xs text-blue-400">{position.category}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {position.totalQuantity.toFixed(4).replace(/\.?0+$/, '')} {position.unitType} · Avg {displayCurrency} {formatMoney(position.avgCostBasis)}/{position.unitType.replace(/s$/, '')}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => handleAddToPosition(position)}
                  className="btn btn-secondary p-2"
                  title="Add lot"
                >
                  <FaPlus size={12} />
                </button>
                <button
                  onClick={() => setExpandedPosition(
                    expandedPosition === position.positionKey ? null : position.positionKey
                  )}
                  className="btn btn-secondary p-2"
                  title="Show lots"
                >
                  {expandedPosition === position.positionKey
                    ? <FaChevronUp size={12} />
                    : <FaChevronDown size={12} />}
                </button>
              </div>
            </div>

            {/* Position Amounts */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Invested</div>
                <div className="font-semibold dark:text-white">
                  {displayCurrency} {formatMoney(position.totalInvested)}
                </div>
              </div>
              {position.currentValue !== undefined && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Current Value</div>
                  <div className="font-semibold dark:text-white">
                    {displayCurrency} {formatMoney(position.currentValue)}
                  </div>
                </div>
              )}
            </div>

            {/* Returns */}
            {position.returnAmount !== undefined && position.returnPercentage !== undefined && (
              <div className={`mt-3 flex items-center justify-between rounded-lg px-3 py-2 ${
                position.returnAmount >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                <span className="text-xs text-gray-400">Return</span>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${
                    position.returnAmount >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {position.returnAmount >= 0 ? '+' : ''}{displayCurrency} {formatMoney(position.returnAmount)}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    position.returnAmount >= 0
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {position.returnAmount >= 0 ? '+' : ''}{(position.returnPercentage ?? 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}

            {/* Valuation indicator */}
            {position.useManualValuation && (
              <div className="mt-2 text-xs text-gray-500 italic">Manual valuation</div>
            )}
            {!position.useManualValuation && position.ticker && position.currentPricePerUnit !== undefined && (
              <div className="mt-2 text-xs text-gray-500">
                Live: {displayCurrency} {formatMoney(position.currentPricePerUnit)}/{position.unitType.replace(/s$/, '')}
                {state.priceCache?.[position.ticker] && (
                  <span className="text-gray-600"> · {new Date(state.priceCache[position.ticker].lastUpdated).toLocaleString()}</span>
                )}
              </div>
            )}
            {!position.useManualValuation && position.ticker && position.currentValue === undefined && !state.settings.alphaVantageApiKey && (
              <div className="mt-2 text-xs text-amber-500/80 italic">
                Add API key in Settings for auto price updates
              </div>
            )}
            {!position.useManualValuation && position.ticker && position.currentValue === undefined && state.settings.alphaVantageApiKey && (
              <div className="mt-2 text-xs text-amber-500/80 italic">
                Price pending — tap Refresh Prices
              </div>
            )}

            {/* Expanded Lots */}
            {expandedPosition === position.positionKey && (
              <div className="mt-4 border-t border-gray-700 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs font-medium text-gray-400">
                    Purchase Lots ({position.lots.length})
                  </div>
                  <button
                    onClick={() => handleDeletePosition(position.positionKey)}
                    className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
                  >
                    <FaTrash size={10} /> Delete Position
                  </button>
                </div>
                <div className="space-y-2">
                  {position.lots.map(lot => (
                    <div
                      key={lot.id}
                      className="flex justify-between items-center bg-gray-800/50 rounded-lg p-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm dark:text-white">
                          {lot.quantity.toFixed(4).replace(/\.?0+$/, '')} {lot.unitType} @ {lot.purchaseCurrency || displayCurrency} {formatMoney(lot.pricePerUnit)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(lot.date).toLocaleDateString()} · Total: {displayCurrency} {formatLotValue(lot)}
                          {lot.purchaseCurrency === 'USD' && displayCurrency === 'SAR' && (
                            <span className="text-gray-600"> (${formatMoney(lot.quantity * lot.pricePerUnit)})</span>
                          )}
                        </div>
                        {lot.manualCurrentValue !== undefined && (
                          <div className="text-xs text-blue-400">
                            Current: {displayCurrency} {formatMoney(lot.manualCurrentValue)}
                          </div>
                        )}
                        {lot.notes && (
                          <div className="text-xs text-gray-500 mt-0.5">{lot.notes}</div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleEditLot(lot)}
                          className="btn btn-secondary p-1.5"
                        >
                          <FaEdit size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteLot(lot.id)}
                          className="p-1.5 rounded text-red-500 hover:bg-red-500/10"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {positions.length === 0 && !showForm && (
          <p className="text-center text-gray-500 dark:text-gray-400">
            No investments yet. Add one to start tracking!
          </p>
        )}
      </div>
    </div>
  );
}
