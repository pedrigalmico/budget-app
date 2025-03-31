import { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { Expense } from '../types';
import { FaPlus, FaEdit } from 'react-icons/fa';

const CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Health & Wellness',
  'Other'
];

export default function Expenses() {
  const { state, addExpense, updateExpense, formatMoney } = useAppState();
  const [showForm, setShowForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const filteredExpenses = state.expenses.filter(expense => 
    expense.date.startsWith(selectedMonth)
  );

  // Calculate total expenses for selected month
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const expenseData: Expense = {
      id: editingExpense?.id || crypto.randomUUID(),
      amount: parseFloat(formData.get('amount') as string) || 0,
      category: formData.get('category') as string,
      date: formData.get('date') as string,
      note: (formData.get('note') as string) || undefined
    };

    if (editingExpense) {
      updateExpense(expenseData);
      setEditingExpense(null);
    } else {
      addExpense(expenseData);
    }

    setShowForm(false);
    form.reset();
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Expenses</h1>
        <button
          onClick={() => {
            setEditingExpense(null);
            setShowForm(!showForm);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <FaPlus /> Add Expense
        </button>
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">
            {editingExpense ? 'Edit Expense' : 'Add New Expense'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="input mt-1"
                defaultValue={editingExpense?.amount}
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-1">
                Category
              </label>
              <select 
                name="category" 
                id="category" 
                required 
                className="input mt-1"
                defaultValue={editingExpense?.category || CATEGORIES[0]}
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
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
                className="input mt-1"
                defaultValue={editingExpense?.date}
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
                className="input mt-1"
                defaultValue={editingExpense?.note}
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary flex-1">
                {editingExpense ? 'Save Changes' : 'Add Expense'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingExpense(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Month Filter */}
      <div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="input"
        />
      </div>

      {/* Monthly Total Card */}
      <div className="card">
        <h2 className="text-lg text-gray-400">Total Expenses for {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
        <div className="text-3xl font-bold text-red-500">
          {state.settings.currency} {formatMoney(totalExpenses)}
        </div>
      </div>

      {/* Expenses List */}
      <div className="space-y-4">
        {filteredExpenses.map(expense => (
          <div key={expense.id} className="card">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium dark:text-white">{expense.category}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(expense.date).toLocaleDateString()}
                  {expense.note && ` - ${expense.note}`}
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="text-right">
                  <div className="font-semibold dark:text-white">
                    {state.settings.currency} {formatMoney(expense.amount)}
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(expense)}
                  className="btn btn-secondary p-2"
                >
                  <FaEdit />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredExpenses.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400">
            No expenses found for this month.
          </p>
        )}
      </div>
    </div>
  );
} 