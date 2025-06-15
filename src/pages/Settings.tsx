import { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { Settings as SettingsType } from '../types';
import { DEFAULT_CATEGORIES, createCategory } from '../config/categories';

export default function Settings() {
  const { state, updateSettings, clearData } = useAppState();
  const [showConfirm, setShowConfirm] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

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
    
    const settings: SettingsType = {
      currency: formData.get('currency') as string,
      darkMode: formData.get('darkMode') === 'true',
      customCategories: state.settings.customCategories || []
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
    <div className="min-h-screen p-4">
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