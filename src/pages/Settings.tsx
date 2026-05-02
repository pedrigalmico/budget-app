import { useState, useCallback } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { Settings as SettingsType } from '../types';
import { DEFAULT_CATEGORIES, createCategory } from '../config/categories';
import { groupLotsIntoPositions } from '../utils/investmentUtils';

export default function Settings() {
  const { state, updateSettings, clearData, formatMoney } = useAppState();
  const [showConfirm, setShowConfirm] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const downloadFile = useCallback((content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportJSON = useCallback(() => {
    const exportData = {
      exportDate: new Date().toISOString(),
      currency: state.settings.currency,
      expenses: state.expenses,
      incomes: state.incomes,
      investments: state.investments,
      goals: state.goals,
      priceCache: state.priceCache,
      settings: {
        monthlyIncome: state.settings.monthlyIncome,
        categoryBudgets: state.settings.categoryBudgets
      }
    };
    const json = JSON.stringify(exportData, null, 2);
    downloadFile(json, `budget-export-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    setExportStatus('JSON exported!');
    setTimeout(() => setExportStatus(''), 2000);
  }, [state, downloadFile]);

  const handleExportLLM = useCallback(() => {
    const currency = state.settings.currency;
    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Calculate summaries
    const thisMonthExpenses = state.expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalMonthExpenses = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);

    const expensesByCategory: Record<string, number> = {};
    thisMonthExpenses.forEach(e => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
    });

    // Investment calculations using positions
    const positions = groupLotsIntoPositions(state.investments, state.priceCache, state.settings.usdToSarRate, state.settings.currency);
    const totalInvested = positions.reduce((s, p) => s + p.totalInvested, 0);
    const totalCurrentValue = positions.reduce((s, p) => s + (p.currentValue ?? p.totalInvested), 0);

    const investmentsByCategory: Record<string, { invested: number; current: number }> = {};
    positions.forEach(p => {
      if (!investmentsByCategory[p.category]) investmentsByCategory[p.category] = { invested: 0, current: 0 };
      investmentsByCategory[p.category].invested += p.totalInvested;
      investmentsByCategory[p.category].current += (p.currentValue ?? p.totalInvested);
    });

    const totalGoalTarget = state.goals.reduce((s, g) => s + g.targetAmount, 0);
    const totalGoalSaved = state.goals.reduce((s, g) => s + g.currentAmount, 0);

    const allTimeExpenses = state.expenses.reduce((s, e) => s + e.amount, 0);

    let text = `# Personal Finance Summary\n`;
    text += `Export Date: ${now.toLocaleDateString()}\nCurrency: ${currency}\n\n`;

    // Income
    text += `## Income Sources\n`;
    state.incomes.forEach(i => {
      text += `- ${i.name}: ${formatMoney(i.amount)} ${currency} (${i.frequency}${i.isRecurring ? ', recurring' : ''})\n`;
    });
    text += `\n`;

    // This month expenses
    text += `## Expenses - ${currentMonth}\n`;
    text += `Total: ${formatMoney(totalMonthExpenses)} ${currency}\n\n`;
    text += `By Category:\n`;
    Object.entries(expensesByCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, amount]) => {
        const pct = totalMonthExpenses > 0 ? ((amount / totalMonthExpenses) * 100).toFixed(1) : '0';
        text += `- ${cat}: ${formatMoney(amount)} ${currency} (${pct}%)\n`;
      });

    // Budget limits
    if (state.settings.categoryBudgets && Object.keys(state.settings.categoryBudgets).length > 0) {
      text += `\nBudget Limits vs Actual:\n`;
      Object.entries(state.settings.categoryBudgets).forEach(([cat, limit]) => {
        const spent = expensesByCategory[cat] || 0;
        const pct = ((spent / limit) * 100).toFixed(0);
        text += `- ${cat}: ${formatMoney(spent)} / ${formatMoney(limit)} ${currency} (${pct}% used)\n`;
      });
    }
    text += `\n`;

    // All expenses (for historical analysis)
    text += `## All Expense Records\n`;
    text += `Total all-time expenses: ${formatMoney(allTimeExpenses)} ${currency}\n`;
    text += `Total records: ${state.expenses.length}\n\n`;
    state.expenses
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach(e => {
        text += `- ${new Date(e.date).toLocaleDateString()}: ${e.category} - ${formatMoney(e.amount)} ${currency}${e.note ? ` (${e.note})` : ''}${e.accountType ? ` [${e.accountType}]` : ''}\n`;
      });
    text += `\n`;

    // Investments
    text += `## Investment Portfolio\n`;
    text += `Total Invested: ${formatMoney(totalInvested)} ${currency}\n`;
    text += `Current Value: ${formatMoney(totalCurrentValue)} ${currency}\n`;
    text += `Return: ${formatMoney(totalCurrentValue - totalInvested)} ${currency} (${totalInvested > 0 ? (((totalCurrentValue - totalInvested) / totalInvested) * 100).toFixed(1) : '0'}%)\n\n`;

    text += `By Category:\n`;
    Object.entries(investmentsByCategory).forEach(([cat, data]) => {
      const ret = data.current - data.invested;
      text += `- ${cat}: Invested ${formatMoney(data.invested)}, Current ${formatMoney(data.current)}, Return ${formatMoney(ret)} ${currency}\n`;
    });

    text += `\nDetailed Positions:\n`;
    positions.forEach(p => {
      text += `- ${p.name}${p.ticker ? ` (${p.ticker})` : ''} [${p.category}]: ${p.totalQuantity} ${p.unitType}, Invested ${formatMoney(p.totalInvested)}, Current ${formatMoney(p.currentValue ?? p.totalInvested)} ${currency}`;
      if (p.returnPercentage !== undefined) {
        text += ` (${(p.returnAmount ?? 0) >= 0 ? '+' : ''}${(p.returnPercentage ?? 0).toFixed(1)}%)`;
      }
      text += '\n';
      p.lots.forEach(lot => {
        text += `    ${lot.quantity} ${lot.unitType} @ ${formatMoney(lot.pricePerUnit)} [${new Date(lot.date).toLocaleDateString()}]${lot.notes ? ` - ${lot.notes}` : ''}\n`;
      });
    });
    text += `\n`;

    // Goals
    text += `## Savings Goals\n`;
    text += `Total Target: ${formatMoney(totalGoalTarget)} ${currency}\n`;
    text += `Total Saved: ${formatMoney(totalGoalSaved)} ${currency}\n`;
    text += `Progress: ${totalGoalTarget > 0 ? ((totalGoalSaved / totalGoalTarget) * 100).toFixed(1) : '0'}%\n\n`;
    state.goals.forEach(g => {
      const pct = g.targetAmount > 0 ? ((g.currentAmount / g.targetAmount) * 100).toFixed(1) : '0';
      text += `- ${g.name}: ${formatMoney(g.currentAmount)} / ${formatMoney(g.targetAmount)} ${currency} (${pct}%)\n`;
    });

    downloadFile(text, `budget-summary-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
    setExportStatus('LLM summary exported!');
    setTimeout(() => setExportStatus(''), 2000);
  }, [state, formatMoney, downloadFile]);

  const handleCopyLLM = useCallback(() => {
    const currency = state.settings.currency;
    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const thisMonthExpenses = state.expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalMonthExpenses = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
    const expensesByCategory: Record<string, number> = {};
    thisMonthExpenses.forEach(e => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
    });

    // Investment calculations using positions
    const positions = groupLotsIntoPositions(state.investments, state.priceCache, state.settings.usdToSarRate, state.settings.currency);
    const totalInvested = positions.reduce((s, p) => s + p.totalInvested, 0);
    const totalCurrentValue = positions.reduce((s, p) => s + (p.currentValue ?? p.totalInvested), 0);
    const investmentsByCategory: Record<string, { invested: number; current: number }> = {};
    positions.forEach(p => {
      if (!investmentsByCategory[p.category]) investmentsByCategory[p.category] = { invested: 0, current: 0 };
      investmentsByCategory[p.category].invested += p.totalInvested;
      investmentsByCategory[p.category].current += (p.currentValue ?? p.totalInvested);
    });

    const totalGoalTarget = state.goals.reduce((s, g) => s + g.targetAmount, 0);
    const totalGoalSaved = state.goals.reduce((s, g) => s + g.currentAmount, 0);
    const allTimeExpenses = state.expenses.reduce((s, e) => s + e.amount, 0);

    let text = `# Personal Finance Summary\n`;
    text += `Export Date: ${now.toLocaleDateString()}\nCurrency: ${currency}\n\n`;
    text += `## Income Sources\n`;
    state.incomes.forEach(i => {
      text += `- ${i.name}: ${formatMoney(i.amount)} ${currency} (${i.frequency}${i.isRecurring ? ', recurring' : ''})\n`;
    });
    text += `\n## Expenses - ${currentMonth}\nTotal: ${formatMoney(totalMonthExpenses)} ${currency}\n\nBy Category:\n`;
    Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, amount]) => {
      const pct = totalMonthExpenses > 0 ? ((amount / totalMonthExpenses) * 100).toFixed(1) : '0';
      text += `- ${cat}: ${formatMoney(amount)} ${currency} (${pct}%)\n`;
    });
    if (state.settings.categoryBudgets && Object.keys(state.settings.categoryBudgets).length > 0) {
      text += `\nBudget Limits vs Actual:\n`;
      Object.entries(state.settings.categoryBudgets).forEach(([cat, limit]) => {
        const spent = expensesByCategory[cat] || 0;
        text += `- ${cat}: ${formatMoney(spent)} / ${formatMoney(limit)} ${currency} (${((spent / limit) * 100).toFixed(0)}% used)\n`;
      });
    }
    text += `\n## All Expense Records\nTotal all-time: ${formatMoney(allTimeExpenses)} ${currency} | Records: ${state.expenses.length}\n\n`;
    state.expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(e => {
      text += `- ${new Date(e.date).toLocaleDateString()}: ${e.category} - ${formatMoney(e.amount)} ${currency}${e.note ? ` (${e.note})` : ''}${e.accountType ? ` [${e.accountType}]` : ''}\n`;
    });
    text += `\n## Investment Portfolio\nTotal Invested: ${formatMoney(totalInvested)} ${currency}\nCurrent Value: ${formatMoney(totalCurrentValue)} ${currency}\nReturn: ${formatMoney(totalCurrentValue - totalInvested)} ${currency} (${totalInvested > 0 ? (((totalCurrentValue - totalInvested) / totalInvested) * 100).toFixed(1) : '0'}%)\n\n`;
    Object.entries(investmentsByCategory).forEach(([cat, data]) => {
      text += `- ${cat}: Invested ${formatMoney(data.invested)}, Current ${formatMoney(data.current)} ${currency}\n`;
    });
    text += `\nPositions:\n`;
    positions.forEach(p => {
      text += `- ${p.name}${p.ticker ? ` (${p.ticker})` : ''}: ${p.totalQuantity} ${p.unitType}, Invested ${formatMoney(p.totalInvested)}, Current ${formatMoney(p.currentValue ?? p.totalInvested)} ${currency}\n`;
    });
    text += `\n## Savings Goals\nTotal: ${formatMoney(totalGoalSaved)} / ${formatMoney(totalGoalTarget)} ${currency} (${totalGoalTarget > 0 ? ((totalGoalSaved / totalGoalTarget) * 100).toFixed(1) : '0'}%)\n`;
    state.goals.forEach(g => {
      text += `- ${g.name}: ${formatMoney(g.currentAmount)} / ${formatMoney(g.targetAmount)} ${currency}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setExportStatus('Copied to clipboard! Paste into ChatGPT or Claude.');
      setTimeout(() => setExportStatus(''), 3000);
    });
  }, [state, formatMoney]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const usdToSarRateStr = formData.get('usdToSarRate') as string;
    const settings: SettingsType = {
      ...state.settings,
      currency: formData.get('currency') as string,
      darkMode: formData.get('darkMode') === 'true',
      customCategories: state.settings.customCategories || [],
      alphaVantageApiKey: (formData.get('alphaVantageApiKey') as string) || state.settings.alphaVantageApiKey,
      usdToSarRate: usdToSarRateStr ? parseFloat(usdToSarRateStr) : 3.75,
    };

    updateSettings(settings);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    const settings: SettingsType = {
      ...state.settings,
      customCategories: [
        ...(state.settings.customCategories || []),
        createCategory(newCategory.trim())
      ]
    };

    updateSettings(settings);
    setNewCategory('');
  };

  const handleRemoveCategory = (categoryId: string) => {
    const settings: SettingsType = {
      ...state.settings,
      customCategories: (state.settings.customCategories || []).filter(
        cat => cat.id !== categoryId
      )
    };

    updateSettings(settings);
  };

  const handleRemoveDefaultCategory = (categoryName: string) => {
    const settings: SettingsType = {
      ...state.settings,
      disabledDefaultCategories: [
        ...(state.settings.disabledDefaultCategories || []),
        categoryName
      ]
    };
    updateSettings(settings);
  };

  const activeDefaultCategories = DEFAULT_CATEGORIES.filter(
    (category) => !(state.settings.disabledDefaultCategories || []).includes(category)
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold dark:text-white">Settings</h1>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="currency" className="block text-sm font-medium mb-1">
                Currency
              </label>
              <select
                name="currency"
                id="currency"
                required
                className="input"
                defaultValue={state.settings.currency}
              >
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div>
              <label htmlFor="darkMode" className="block text-sm font-medium mb-1">
                Dark Mode
              </label>
              <select
                name="darkMode"
                id="darkMode"
                required
                className="input"
                defaultValue={state.settings.darkMode.toString()}
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>

            <div>
              <label htmlFor="alphaVantageApiKey" className="block text-sm font-medium mb-1">
                Alpha Vantage API Key{' '}
                <span className="text-gray-500">(stocks &amp; ETFs only — not needed for gold)</span>
              </label>
              <input
                type="text"
                name="alphaVantageApiKey"
                id="alphaVantageApiKey"
                className="input"
                placeholder="Get free key at alphavantage.co"
                defaultValue={state.settings.alphaVantageApiKey || ''}
              />
              <p className="text-xs text-gray-500 mt-1">
                Only required for stock/ETF prices (25 calls/day free).{' '}
                <strong className="text-gray-400">Gold &amp; silver prices use metals.live → Yahoo Finance → ExchangeRate-API — no key needed.</strong>
              </p>
            </div>

            <div>
              <label htmlFor="usdToSarRate" className="block text-sm font-medium mb-1">
                USD to SAR Rate
              </label>
              <input
                type="number"
                name="usdToSarRate"
                id="usdToSarRate"
                className="input"
                step="0.01"
                min="0"
                defaultValue={state.settings.usdToSarRate || 3.75}
              />
              <p className="text-xs text-gray-500 mt-1">
                Fixed peg rate is 3.75. Used to convert USD investments to SAR.
              </p>
            </div>

            <button type="submit" className="btn btn-primary w-full">
              Save Settings
            </button>
          </form>
        </div>

        {/* Expense Categories */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Expense Categories</h2>
          <div className="card">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Default Categories</h3>
                <div className="grid grid-cols-2 gap-2">
                  {activeDefaultCategories.map(category => (
                    <div key={category} className="flex justify-between items-center text-sm p-2 bg-gray-800 rounded">
                      <span>{category}</span>
                      <button
                        onClick={() => handleRemoveDefaultCategory(category)}
                        className="text-red-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-2">
                  {(state.settings.customCategories || []).map(category => (
                    <div key={category.id} className="flex justify-between items-center text-sm p-2 bg-gray-800 rounded">
                      <span>{category.name}</span>
                      <button
                        onClick={() => handleRemoveCategory(category.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name"
                  className="input flex-1"
                />
                <button type="submit" className="btn btn-primary">
                  Add
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Export Data */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Export Data</h2>
          <div className="card">
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                Export your financial data to analyse with an LLM (ChatGPT, Claude) or keep as backup.
              </p>
              <button
                onClick={handleCopyLLM}
                className="w-full btn bg-purple-600 hover:bg-purple-700 text-white"
              >
                Copy Summary to Clipboard (for LLM)
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleExportLLM}
                  className="flex-1 btn bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Download as Text
                </button>
                <button
                  onClick={handleExportJSON}
                  className="flex-1 btn bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Download as JSON
                </button>
              </div>
              {exportStatus && (
                <p className="text-sm text-green-400 text-center">{exportStatus}</p>
              )}
            </div>
          </div>
        </div>

        {/* Account Management */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Account</h2>
          <div className="card">
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Signed in as: {currentUser?.email}
              </p>
              <button
                onClick={handleLogout}
                className="w-full btn bg-gray-600 hover:bg-gray-700 text-white"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Danger Zone</h2>
          <div className="card border border-red-500">
            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full btn bg-red-600 hover:bg-red-700 text-white"
              >
                Clear All Data
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm">Are you sure? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      clearData();
                      setShowConfirm(false);
                    }}
                    className="flex-1 btn bg-red-600 hover:bg-red-700 text-white"
                  >
                    Yes, Clear Everything
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
