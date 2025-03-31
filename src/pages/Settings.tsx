import { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import type { Settings as SettingsType } from '../types';

export default function Settings() {
  const { state, updateSettings, clearData } = useAppState();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const settings: SettingsType = {
      monthlySpendingLimit: parseFloat(formData.get('monthlySpendingLimit') as string),
      currency: formData.get('currency') as string,
      darkMode: formData.get('darkMode') === 'true'
    };

    updateSettings(settings);
  };

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="monthlySpendingLimit" className="block text-sm font-medium mb-1">
              Monthly Spending Limit
            </label>
            <input
              type="number"
              name="monthlySpendingLimit"
              id="monthlySpendingLimit"
              required
              min="0"
              step="0.01"
              className="input"
              defaultValue={state.settings.monthlySpendingLimit}
            />
          </div>

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

          <button type="submit" className="btn btn-primary w-full">
            Save Settings
          </button>
        </form>
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
  );
} 