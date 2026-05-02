import { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../hooks/useAppState';
import { usePriceUpdates } from '../hooks/usePriceUpdates';
import { InvestmentLot, Position } from '../types';
import { INVESTMENT_CATEGORIES, UNIT_TYPES } from '../config/categories';
import { groupLotsIntoPositions } from '../utils/investmentUtils';
import {
  FaPlus, FaEdit, FaTrash, FaChevronDown, FaChevronUp,
  FaTimes, FaSyncAlt, FaCheck, FaPencilAlt, FaClock,
} from 'react-icons/fa';

// Categories where manual price entry is the primary UX (no API ticker)
const MANUAL_PRICE_CATEGORIES = new Set([
  'Gold / Commodities',
  'Real Estate / REITs',
  'Business',
  'Savings / Fixed Deposit',
  'Other',
]);

/** Friendly label for the price field depending on category */
function priceLabel(category: string, unitType: string, currency: string): string {
  if (category === 'Real Estate / REITs') return `Current value per ${unitType.replace(/s$/, '')} (${currency})`;
  if (category === 'Gold / Commodities')  return `Current price per gram (${currency})`;
  if (category === 'Savings / Fixed Deposit') return `Current balance per unit (${currency})`;
  return `Current price per ${unitType.replace(/s$/, '')} (${currency})`;
}

/** Staleness badge for the manual price timestamp */
function StaleBadge({ lastUpdated, source }: { lastUpdated: string; source: string }) {
  const ageMs   = Date.now() - new Date(lastUpdated).getTime();
  const ageDays = Math.floor(ageMs / 86_400_000);
  const ageHrs  = Math.floor(ageMs / 3_600_000);

  const label = ageDays === 0 ? (ageHrs === 0 ? 'just now' : `${ageHrs}h ago`)
              : ageDays === 1 ? 'yesterday'
              : `${ageDays}d ago`;

  const color = source === 'manual'
    ? (ageDays > 30 ? 'text-red-400' : ageDays > 7 ? 'text-amber-400' : 'text-ink-400')
    : 'text-ink-400';

  return (
    <span className={`flex items-center gap-1 text-xs ${color}`}>
      <FaClock size={9} />
      {source === 'manual' ? 'Manual' : source} · {label}
      {source === 'manual' && ageDays > 7 && (
        <span className="ml-1 font-medium">(update recommended)</span>
      )}
    </span>
  );
}

export default function Investments() {
  const {
    state, addInvestmentLot, updateInvestmentLot, deleteInvestmentLot,
    deletePosition, updatePositionDetails, updatePriceCache, formatMoney,
  } = useAppState();

  const usdToSarRate    = state.settings.usdToSarRate || 3.75;
  const displayCurrency = state.settings.currency;

  const { isUpdating, progress, lastError, lastRefreshed, refreshPrices, hasStaleData, hasAutoTickers } =
    usePriceUpdates(state.investments, state.priceCache, state.settings.alphaVantageApiKey, updatePriceCache);

  // Auto-refresh API prices on mount if stale
  useEffect(() => {
    if (hasStaleData && state.settings.alphaVantageApiKey) refreshPrices(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── lot / position form state ──────────────────────────────────────
  const [showForm,           setShowForm]           = useState(false);
  const [editingLot,         setEditingLot]         = useState<InvestmentLot | null>(null);
  const [expandedPosition,   setExpandedPosition]   = useState<string | null>(null);
  const [selectedPositionKey,setSelectedPositionKey]= useState<string>('new');
  const [selectedCategory,   setSelectedCategory]   = useState<string>('');
  const [useManualVal,       setUseManualVal]        = useState(false);
  const [purchaseCurrency,   setPurchaseCurrency]   = useState<string>('USD');
  const [editingPosition,    setEditingPosition]    = useState<string | null>(null);
  const [editPosName,        setEditPosName]        = useState('');
  const [editPosTicker,      setEditPosTicker]      = useState('');
  const [amountInvested,     setAmountInvested]     = useState<string>('');
  const [pricePerUnit,       setPricePerUnit]       = useState<string>('');
  const [quantity,           setQuantity]           = useState<string>('');

  // ── manual current-price state ────────────────────────────────────
  const [pricingPosition,  setPricingPosition]  = useState<string | null>(null); // positionKey being priced
  const [manualPriceInput, setManualPriceInput] = useState<string>('');

  // ── derived data ──────────────────────────────────────────────────
  const positions = useMemo(() =>
    groupLotsIntoPositions(state.investments, state.priceCache, usdToSarRate, displayCurrency),
    [state.investments, state.priceCache, usdToSarRate, displayCurrency],
  );

  const portfolioTotals = useMemo(() => {
    const totalInvested     = positions.reduce((s, p) => s + p.totalInvested, 0);
    const totalCurrentValue = positions.reduce((s, p) => s + (p.currentValue ?? p.totalInvested), 0);
    const totalReturn       = totalCurrentValue - totalInvested;
    const totalReturnPct    = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
    return { totalInvested, totalCurrentValue, totalReturn, totalReturnPct };
  }, [positions]);

  // ── effects ───────────────────────────────────────────────────────
  useEffect(() => {
    const amt = parseFloat(amountInvested);
    const prc = parseFloat(pricePerUnit);
    if (amt > 0 && prc > 0) setQuantity((amt / prc).toFixed(6).replace(/\.?0+$/, ''));
  }, [amountInvested, pricePerUnit]);

  useEffect(() => {
    const usdCats = ['Stocks', 'ETFs', 'Cryptocurrency', 'Mutual Funds'];
    setPurchaseCurrency(usdCats.includes(selectedCategory) ? 'USD' : displayCurrency);
  }, [selectedCategory, displayCurrency]);

  // ── manual price handler ──────────────────────────────────────────
  const openManualPrice = (position: Position) => {
    const cacheKey = position.ticker || position.positionKey;
    const existing = state.priceCache?.[cacheKey];
    setManualPriceInput(existing ? String(existing.price) : '');
    setPricingPosition(position.positionKey);
  };

  const saveManualPrice = (position: Position) => {
    const value = parseFloat(manualPriceInput);
    if (isNaN(value) || value <= 0) return;

    // Use ticker if it exists (so investmentUtils can find it), otherwise positionKey
    const cacheKey = position.ticker || position.positionKey;

    updatePriceCache({
      ...(state.priceCache || {}),
      [cacheKey]: {
        price: value,
        currency: displayCurrency,   // manual prices are always in display currency
        lastUpdated: new Date().toISOString(),
        source: 'manual',
      },
    });
    setPricingPosition(null);
    setManualPriceInput('');
  };

  const clearManualPrice = (position: Position) => {
    const cacheKey = position.ticker || position.positionKey;
    const updated  = { ...(state.priceCache || {}) };
    delete updated[cacheKey];
    updatePriceCache(updated);
  };

  // ── lot form handlers ─────────────────────────────────────────────
  const resetFormFields = () => { setAmountInvested(''); setPricePerUnit(''); setQuantity(''); };

  const handleAddToPosition = (position: Position) => {
    setEditingLot(null); setSelectedPositionKey(position.positionKey);
    setSelectedCategory(position.category); setUseManualVal(position.useManualValuation);
    resetFormFields(); setShowForm(true); setExpandedPosition(position.positionKey);
  };

  const handleNewPosition = () => {
    setEditingLot(null); setSelectedPositionKey('new'); setSelectedCategory('');
    setUseManualVal(false); resetFormFields(); setShowForm(true);
  };

  const handleEditLot = (lot: InvestmentLot) => {
    setEditingLot(lot); setSelectedPositionKey(lot.positionKey);
    setSelectedCategory(lot.category); setUseManualVal(lot.useManualValuation || false);
    setPurchaseCurrency(lot.purchaseCurrency || displayCurrency);
    setPricePerUnit(String(lot.pricePerUnit));
    setQuantity(String(lot.quantity));
    setAmountInvested(String((lot.quantity * lot.pricePerUnit).toFixed(2)));
    setShowForm(true); setExpandedPosition(lot.positionKey);
  };

  const handleDeleteLot = (lotId: string) => {
    if (window.confirm('Delete this purchase lot?')) deleteInvestmentLot(lotId);
  };

  const handleEditPosition = (position: Position) => {
    setEditingPosition(position.positionKey);
    setEditPosName(position.name); setEditPosTicker(position.ticker || '');
  };

  const handleSavePosition = (positionKey: string) => {
    if (!editPosName.trim()) return;
    updatePositionDetails(positionKey, { name: editPosName.trim(), ticker: editPosTicker.trim().toUpperCase() || undefined });
    setEditingPosition(null);
  };

  const handleDeletePosition = (positionKey: string) => {
    if (window.confirm('Delete this entire position and all its lots?')) {
      deletePosition(positionKey); setExpandedPosition(null);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const isExisting  = selectedPositionKey !== 'new';
    const existingPos = positions.find(p => p.positionKey === selectedPositionKey);

    const category = editingLot ? (formData.get('category') as string) || editingLot.category
      : isExisting && existingPos ? existingPos.category : (formData.get('category') as string);
    const name = editingLot ? (formData.get('name') as string) || editingLot.name
      : isExisting && existingPos ? existingPos.name : (formData.get('name') as string);
    const ticker = editingLot ? ((formData.get('ticker') as string) || undefined)
      : isExisting && existingPos ? existingPos.ticker : ((formData.get('ticker') as string) || undefined);
    const positionKey = isExisting
      ? selectedPositionKey
      : (editingLot?.positionKey || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));

    const qty = parseFloat(quantity); const price = parseFloat(pricePerUnit);
    if (!qty || qty <= 0 || !price || price <= 0) return;

    const manualCurrentValueStr = formData.get('manualCurrentValue') as string;
    const lotData: InvestmentLot = {
      id: editingLot?.id || crypto.randomUUID(),
      positionKey, name, ticker: ticker || undefined, category,
      quantity: qty, pricePerUnit: price, unitType: UNIT_TYPES[category] || 'units',
      purchaseCurrency, date: new Date(formData.get('date') as string).toISOString(),
      notes: (formData.get('notes') as string) || undefined,
      useManualValuation: useManualVal || undefined,
      manualCurrentValue: useManualVal && manualCurrentValueStr ? parseFloat(manualCurrentValueStr) : undefined,
    };

    editingLot ? updateInvestmentLot(lotData) : addInvestmentLot(lotData);
    setShowForm(false); setEditingLot(null); setSelectedPositionKey('new'); resetFormFields();
  };

  const closeForm = () => { setShowForm(false); setEditingLot(null); setSelectedPositionKey('new'); resetFormFields(); };

  // ── derived helpers ───────────────────────────────────────────────
  const isExistingPos = selectedPositionKey !== 'new';
  const existingPos   = positions.find(p => p.positionKey === selectedPositionKey);
  const unitLabel     = isExistingPos && existingPos ? existingPos.unitType : (UNIT_TYPES[selectedCategory] || 'units');

  const sarEquivalent = useMemo(() => {
    if (purchaseCurrency !== 'USD' || displayCurrency !== 'SAR') return null;
    const amt = parseFloat(amountInvested);
    return (!amt || amt <= 0) ? null : amt * usdToSarRate;
  }, [amountInvested, purchaseCurrency, displayCurrency, usdToSarRate]);

  const formTargetPositionKey = showForm && (isExistingPos || editingLot)
    ? (editingLot?.positionKey || selectedPositionKey) : null;

  // ── helpers for lot display ───────────────────────────────────────
  const formatLotValue = (lot: InvestmentLot) => {
    const r = (lot.purchaseCurrency === 'USD' && displayCurrency === 'SAR') ? usdToSarRate : 1;
    return formatMoney(lot.quantity * lot.pricePerUnit * r);
  };

  // ── render lot form ───────────────────────────────────────────────
  const renderLotForm = () => (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">
          {editingLot ? 'Edit Lot' : isExistingPos ? `Add Lot to ${existingPos?.name}` : 'Add New Investment'}
        </h2>
        <button onClick={closeForm} className="btn btn-ghost btn-icon"><FaTimes size={14} /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Position selector — only when creating */}
        {!editingLot && (
          <div>
            <label className="block text-sm font-medium mb-1">Position</label>
            <select
              value={selectedPositionKey}
              onChange={e => {
                setSelectedPositionKey(e.target.value);
                const pos = positions.find(p => p.positionKey === e.target.value);
                if (pos) { setSelectedCategory(pos.category); setUseManualVal(pos.useManualValuation); }
              }}
              className="input"
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

        {/* Fields for new position or editing lot */}
        {(!isExistingPos || editingLot) && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select name="category" required={!isExistingPos} className="input"
                value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                <option value="" disabled>Select a category</option>
                {INVESTMENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input type="text" name="name" required={!isExistingPos} className="input"
                placeholder="e.g. Gold Ring Set, Apartment Block A" defaultValue={editingLot?.name} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Ticker <span className="text-ink-400 font-normal">(optional — for auto price lookup)</span>
              </label>
              <input type="text" name="ticker" className="input uppercase"
                placeholder="AAPL, XAU-18K, XAU-24K — leave blank for manual" defaultValue={editingLot?.ticker} />
              <p className="text-xs text-ink-400 mt-1">
                Gold: XAU-24K · XAU-22K · XAU-21K · XAU-18K · XAU-14K &nbsp;|&nbsp; Silver: XAG
              </p>
            </div>
          </>
        )}

        {/* Purchase currency */}
        <div>
          <label className="block text-sm font-medium mb-1">Purchase Currency</label>
          <div className="flex gap-2">
            {['USD', displayCurrency].filter((v, i, a) => a.indexOf(v) === i).map(cur => (
              <button key={cur} type="button" onClick={() => setPurchaseCurrency(cur)}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors border
                  ${purchaseCurrency === cur
                    ? 'bg-primary-600 text-white border-primary-500'
                    : 'btn-secondary border-white/8'}`}>
                {cur}
              </button>
            ))}
          </div>
        </div>

        {/* Amount + price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Amount Invested ({purchaseCurrency})</label>
            <input type="number" required min="0" step="any" className="input"
              placeholder="e.g. 5000" value={amountInvested} onChange={e => setAmountInvested(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price / {unitLabel.replace(/s$/, '')} ({purchaseCurrency})</label>
            <input type="number" required min="0" step="any" className="input"
              placeholder="e.g. 220" value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} />
          </div>
        </div>

        {/* Quantity summary */}
        <div className="rounded-xl p-3 bg-surface-200 border border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-ink-300">Quantity ({unitLabel})</span>
            <span className="text-sm font-medium">{quantity ? `${quantity} ${unitLabel}` : '—'}</span>
          </div>
          {sarEquivalent && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-ink-400">SAR equivalent</span>
              <span className="text-xs text-primary-400">SAR {formatMoney(sarEquivalent)} <span className="text-ink-500">(@ {usdToSarRate})</span></span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Purchase Date</label>
          <input type="date" name="date" required className="input"
            defaultValue={editingLot?.date ? new Date(editingLot.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1">Notes <span className="text-ink-400 font-normal">(optional)</span></label>
          <textarea name="notes" className="input" rows={2} defaultValue={editingLot?.notes} />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" className="btn btn-primary flex-1">
            {editingLot ? 'Save Changes' : 'Add Lot'}
          </button>
          <button type="button" onClick={closeForm} className="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );

  // ── manual price inline panel ─────────────────────────────────────
  const renderManualPricePanel = (position: Position) => {
    const cacheKey  = position.ticker || position.positionKey;
    const cached    = state.priceCache?.[cacheKey];
    const isManualCategory = MANUAL_PRICE_CATEGORIES.has(position.category);
    const hasNoAutoPrice   = !position.ticker || position.category === 'Gold / Commodities' || position.category === 'Real Estate / REITs';

    // Always show for manual categories; also show as fallback option for any position without a current price
    if (!isManualCategory && position.currentValue !== undefined) return null;

    return (
      <div className="mt-3 border-t border-white/5 pt-3">
        {pricingPosition === position.positionKey ? (
          /* ── edit mode ── */
          <div className="space-y-2">
            <label className="block text-xs font-medium text-ink-300">
              {priceLabel(position.category, position.unitType, displayCurrency)}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="any"
                autoFocus
                className="input flex-1 text-sm"
                placeholder={position.category === 'Real Estate / REITs' ? 'e.g. 650000' : 'e.g. 310.50'}
                value={manualPriceInput}
                onChange={e => setManualPriceInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveManualPrice(position); } if (e.key === 'Escape') setPricingPosition(null); }}
              />
              <button onClick={() => saveManualPrice(position)} className="btn btn-primary btn-sm gap-1">
                <FaCheck size={10} /> Save
              </button>
              <button onClick={() => setPricingPosition(null)} className="btn btn-ghost btn-sm">
                <FaTimes size={12} />
              </button>
            </div>
            {position.category === 'Real Estate / REITs' && (
              <p className="text-xs text-ink-400">
                Enter current market value per property. With {position.totalQuantity} unit{position.totalQuantity !== 1 ? 's' : ''}, total = <strong>{displayCurrency} {formatMoney((parseFloat(manualPriceInput) || 0) * position.totalQuantity)}</strong>
              </p>
            )}
            {(position.category === 'Gold / Commodities') && (
              <p className="text-xs text-ink-400">
                Enter price per gram of {position.unitType}. With {position.totalQuantity}g total = <strong>{displayCurrency} {formatMoney((parseFloat(manualPriceInput) || 0) * position.totalQuantity)}</strong>
              </p>
            )}
          </div>
        ) : (
          /* ── display mode ── */
          <div className="flex items-center justify-between gap-2">
            {cached ? (
              <StaleBadge lastUpdated={cached.lastUpdated} source={cached.source} />
            ) : (
              <span className="text-xs text-amber-400/80">
                {hasNoAutoPrice ? 'No current price set' : 'Tap to set a manual price override'}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => openManualPrice(position)}
                className="btn btn-ghost btn-sm gap-1.5 text-xs"
              >
                <FaPencilAlt size={10} />
                {cached ? 'Update Price' : 'Set Price'}
              </button>
              {cached?.source === 'manual' && (
                <button
                  onClick={() => clearManualPrice(position)}
                  className="btn btn-ghost btn-sm text-red-400/70 hover:text-red-400"
                  title="Clear manual price"
                >
                  <FaTimes size={11} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── main render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1>Investments</h1>
        <button onClick={handleNewPosition} className="btn btn-primary">
          <FaPlus size={12} /> Add Lot
        </button>
      </div>

      {/* Portfolio Summary */}
      {positions.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-ink-300">Portfolio Summary</h2>
            {hasAutoTickers && (
              <button onClick={() => refreshPrices(true)} disabled={isUpdating}
                className={`btn btn-sm gap-1.5 ${isUpdating ? 'btn-ghost opacity-50 cursor-not-allowed' : 'btn-ghost text-primary-400'}`}>
                <FaSyncAlt size={10} className={isUpdating ? 'animate-spin' : ''} />
                {isUpdating ? 'Updating…' : 'Refresh Prices'}
              </button>
            )}
          </div>

          {isUpdating && progress && <p className="text-xs text-primary-400 mb-2">{progress}</p>}
          {lastError    && <p className="text-xs text-amber-400 mb-2">{lastError}</p>}
          {lastRefreshed && !isUpdating && <p className="text-xs text-ink-400 mb-3">Last refreshed: {lastRefreshed}</p>}

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Invested',   value: portfolioTotals.totalInvested,     color: '' },
              { label: 'Current',    value: portfolioTotals.totalCurrentValue,  color: '' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-3 bg-surface-200">
                <div className="stat-label mb-1">{label}</div>
                <div className="text-sm font-semibold">{displayCurrency} {formatMoney(value)}</div>
              </div>
            ))}
            <div className={`rounded-xl p-3 ${portfolioTotals.totalReturn >= 0 ? 'bg-accent-green/10' : 'bg-accent-red/10'}`}>
              <div className="stat-label mb-1">Return</div>
              <div className={`text-sm font-semibold ${portfolioTotals.totalReturn >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                {portfolioTotals.totalReturn >= 0 ? '+' : ''}{portfolioTotals.totalReturnPct.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New position form */}
      {showForm && !isExistingPos && !editingLot && renderLotForm()}

      {/* Position Cards */}
      <div className="space-y-4">
        {positions.map(position => {
          const cacheKey = position.ticker || position.positionKey;
          const cached   = state.priceCache?.[cacheKey];

          return (
            <div key={position.positionKey} className="card">
              {/* Position header — edit mode */}
              {editingPosition === position.positionKey ? (
                <div className="mb-3 space-y-2">
                  <div className="flex gap-2">
                    <input type="text" value={editPosName} onChange={e => setEditPosName(e.target.value)}
                      className="input flex-1 text-sm" placeholder="Name" />
                    <input type="text" value={editPosTicker} onChange={e => setEditPosTicker(e.target.value)}
                      className="input w-28 text-sm uppercase" placeholder="Ticker" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSavePosition(position.positionKey)} className="btn btn-primary btn-sm gap-1">
                      <FaCheck size={10} /> Save
                    </button>
                    <button onClick={() => setEditingPosition(null)} className="btn btn-ghost btn-sm gap-1">
                      <FaTimes size={10} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Position header — display mode */
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base truncate">{position.name}</h3>
                      {position.ticker && (
                        <span className="chip chip-active text-[11px] px-2 py-0.5">{position.ticker}</span>
                      )}
                    </div>
                    <div className="text-xs text-primary-400 mt-0.5">{position.category}</div>
                    <div className="text-xs text-ink-400 mt-0.5">
                      {position.totalQuantity.toFixed(4).replace(/\.?0+$/, '')} {position.unitType}
                      {' · '}avg {displayCurrency} {formatMoney(position.avgCostBasis)}/{position.unitType.replace(/s$/, '')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button onClick={() => handleEditPosition(position)} className="btn btn-ghost btn-icon" title="Edit name/ticker">
                      <FaEdit size={12} />
                    </button>
                    <button onClick={() => handleAddToPosition(position)} className="btn btn-ghost btn-icon" title="Add lot">
                      <FaPlus size={12} />
                    </button>
                    <button onClick={() => setExpandedPosition(expandedPosition === position.positionKey ? null : position.positionKey)}
                      className="btn btn-ghost btn-icon" title="Show lots">
                      {expandedPosition === position.positionKey ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Value summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 bg-surface-200">
                  <div className="stat-label mb-1">Invested</div>
                  <div className="text-sm font-semibold">{displayCurrency} {formatMoney(position.totalInvested)}</div>
                </div>
                <div className="rounded-xl p-3 bg-surface-200">
                  <div className="stat-label mb-1">Current Value</div>
                  <div className="text-sm font-semibold">
                    {position.currentValue !== undefined
                      ? `${displayCurrency} ${formatMoney(position.currentValue)}`
                      : <span className="text-ink-400 text-xs">—</span>}
                  </div>
                </div>
              </div>

              {/* Return row */}
              {position.returnAmount !== undefined && position.returnPercentage !== undefined && (
                <div className={`mt-3 flex items-center justify-between rounded-xl px-3 py-2 ${
                  position.returnAmount >= 0 ? 'bg-accent-green/10' : 'bg-accent-red/10'}`}>
                  <span className="text-xs text-ink-300">Return</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold ${position.returnAmount >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                      {position.returnAmount >= 0 ? '+' : ''}{displayCurrency} {formatMoney(position.returnAmount)}
                    </span>
                    <span className={`chip text-xs ${position.returnAmount >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                      {position.returnAmount >= 0 ? '+' : ''}{position.returnPercentage.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}

              {/* ── Manual price panel (Gold, Real Estate, no-ticker) ── */}
              {renderManualPricePanel(position)}

              {/* Auto-price source indicator (for ticker-based positions) */}
              {!MANUAL_PRICE_CATEGORIES.has(position.category) && position.ticker && cached && cached.source !== 'manual' && (
                <div className="mt-2">
                  <StaleBadge lastUpdated={cached.lastUpdated} source={cached.source} />
                </div>
              )}
              {!MANUAL_PRICE_CATEGORIES.has(position.category) && position.ticker && !cached && (
                <p className="mt-2 text-xs text-amber-400/80">
                  {state.settings.alphaVantageApiKey ? 'Price pending — tap Refresh Prices' : 'Add API key in Settings for auto price updates'}
                </p>
              )}

              {/* Expanded lots */}
              {expandedPosition === position.positionKey && (
                <div className="mt-4 border-t border-white/5 pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-ink-400">Purchase Lots ({position.lots.length})</span>
                    <button onClick={() => handleDeletePosition(position.positionKey)}
                      className="text-xs text-red-400/70 hover:text-red-400 flex items-center gap-1">
                      <FaTrash size={10} /> Delete Position
                    </button>
                  </div>
                  <div className="space-y-2">
                    {position.lots.map(lot => (
                      <div key={lot.id} className="flex justify-between items-center rounded-xl p-2.5 bg-surface-200">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">
                            {lot.quantity.toFixed(4).replace(/\.?0+$/, '')} {lot.unitType} @ {lot.purchaseCurrency || displayCurrency} {formatMoney(lot.pricePerUnit)}
                          </div>
                          <div className="text-xs text-ink-400">
                            {new Date(lot.date).toLocaleDateString()} · Total: {displayCurrency} {formatLotValue(lot)}
                            {lot.purchaseCurrency === 'USD' && displayCurrency === 'SAR' && (
                              <span className="text-ink-500"> (${formatMoney(lot.quantity * lot.pricePerUnit)})</span>
                            )}
                          </div>
                          {lot.notes && <div className="text-xs text-ink-400 mt-0.5">{lot.notes}</div>}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button onClick={() => handleEditLot(lot)} className="btn btn-ghost btn-icon">
                            <FaEdit size={12} />
                          </button>
                          <button onClick={() => handleDeleteLot(lot.id)} className="btn btn-icon text-red-400/70 hover:text-red-400">
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline lot form */}
              {formTargetPositionKey === position.positionKey && (
                <div className="mt-4 border-t border-primary-500/20 pt-4">{renderLotForm()}</div>
              )}
            </div>
          );
        })}

        {positions.length === 0 && !showForm && (
          <div className="card text-center py-12 text-ink-400">
            <p className="text-sm">No investments yet.</p>
            <button onClick={handleNewPosition} className="btn btn-primary mt-4">Add your first investment</button>
          </div>
        )}
      </div>
    </div>
  );
}
