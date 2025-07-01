import { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import type { Income as IncomeType, IncomeType as IncomeCategory } from '../types';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

const INCOME_TYPES: IncomeCategory[] = ['Salary', 'Freelance', 'Investment', 'Business', 'Other'];

// Helper functions for income calculations
const calculateMonthlyIncome = (incomes: IncomeType[]): number => {
  return incomes.reduce((total, income) => {
    if (income.frequency === 'Monthly' && income.isRecurring) {
      return total + income.amount;
    }
    if (income.frequency === 'Yearly' && income.isRecurring) {
      return total + (income.amount / 12);
    }
    if (income.frequency === 'Weekly' && income.isRecurring) {
      return total + (income.amount * 52 / 12);
    }
    return total;
  }, 0);
};

const calculateCurrentMonthIncome = (incomes: IncomeType[]): number => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return incomes.reduce((total, income) => {
    const incomeDate = new Date(income.date);
    
    // Include all recurring monthly incomes
    if (income.isRecurring && income.frequency === 'Monthly') {
      return total + income.amount;
    }
    
    // Include one-time incomes that fall within this month
    if (income.frequency === 'One-time' && 
        incomeDate >= startOfMonth && 
        incomeDate <= endOfMonth) {
      return total + income.amount;
    }
    
    // Include weekly incomes for this month
    if (income.frequency === 'Weekly' && income.isRecurring) {
      return total + (income.amount * 4);
    }
    
    // Include proportional yearly income for this month
    if (income.frequency === 'Yearly' && income.isRecurring) {
      return total + (income.amount / 12);
    }
    
    return total;
  }, 0);
};

export default function Income() {
  const { state, addIncome, updateIncome, deleteIncome } = useAppState();
  const [showForm, setShowForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeType | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const incomeData: IncomeType = {
      id: editingIncome?.id || crypto.randomUUID(),
      name: formData.get('name') as string,
      amount: parseFloat(formData.get('amount') as string),
      type: formData.get('type') as IncomeCategory,
      frequency: formData.get('frequency') as IncomeType['frequency'],
      isRecurring: formData.get('frequency') !== 'One-time',
      date: formData.get('date') as string,
      note: formData.get('note') as string || undefined
    };

    if (editingIncome) {
      updateIncome(incomeData);
      setEditingIncome(null);
    } else {
      addIncome(incomeData);
    }
    setShowForm(false);
    form.reset();
  };

  const handleEdit = (income: IncomeType) => {
    setEditingIncome(income);
    setShowForm(true);
  };

  const handleDelete = (incomeId: string) => {
    if (window.confirm('Are you sure you want to delete this income?')) {
      try {
        deleteIncome(incomeId);
        setShowForm(false);
        setEditingIncome(null);
      } catch (error) {
        console.error('Failed to delete income:', error);
        alert('Failed to delete income. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6 pb-20">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold dark:text-white">Income Sources</h1>
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <FaPlus /> Add Income
            </button>
          </div>

          {/* Summary Card */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Income Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400">Monthly Recurring</div>
                <div className="text-2xl font-bold text-green-500">
                  {state.settings.currency} {calculateMonthlyIncome(state.incomes)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">This Month's Total</div>
                <div className="text-2xl font-bold text-blue-500">
                  {state.settings.currency} {calculateCurrentMonthIncome(state.incomes)}
                </div>
              </div>
            </div>
          </div>

          {/* Add/Edit Form */}
          {showForm && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">
                {editingIncome ? 'Edit Income' : 'Add New Income'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    Income Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    className="input"
                    placeholder="e.g., Main Job Salary"
                    defaultValue={editingIncome?.name}
                  />
                </div>

                <div>
                  <label htmlFor="amount" className="block text-sm font-medium mb-1">
                    Amount ({state.settings.currency})
                  </label>
                  <input
                    type="number"
                    name="amount"
                    id="amount"
                    required
                    min="0"
                    step="0.01"
                    className="input"
                    defaultValue={editingIncome?.amount}
                  />
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium mb-1">
                    Type
                  </label>
                  <select
                    name="type"
                    id="type"
                    required
                    className="input"
                    defaultValue={editingIncome?.type}
                  >
                    {INCOME_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium mb-1">
                    Frequency
                  </label>
                  <select
                    name="frequency"
                    id="frequency"
                    required
                    className="input"
                    defaultValue={editingIncome?.frequency}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="One-time">One-time</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="date" className="block text-sm font-medium mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    id="date"
                    required
                    className="input"
                    defaultValue={editingIncome?.date}
                  />
                </div>

                <div>
                  <label htmlFor="note" className="block text-sm font-medium mb-1">
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    name="note"
                    id="note"
                    className="input"
                    defaultValue={editingIncome?.note}
                  />
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary flex-1">
                    {editingIncome ? 'Save Changes' : 'Add Income'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingIncome(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
                {editingIncome && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingIncome.id)}
                    className="btn bg-red-600 hover:bg-red-700 text-white w-full flex items-center justify-center gap-2 mt-6"
                  >
                    <FaTrash /> Delete Income
                  </button>
                )}
              </form>
            </div>
          )}

          {/* Income List */}
          <div className="space-y-4">
            {state.incomes.map(income => (
              <div key={income.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{income.name}</h3>
                    <div className="text-sm text-gray-400">
                      {income.type} • {income.frequency}
                    </div>
                    {income.note && (
                      <div className="mt-1 text-sm text-gray-400">{income.note}</div>
                    )}
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="text-right">
                      <div className="font-semibold text-green-500">
                        {state.settings.currency} {income.amount.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {new Date(income.date).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleEdit(income)}
                      className="btn btn-secondary p-2"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 