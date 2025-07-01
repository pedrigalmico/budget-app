import { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { Expense as ExpenseType } from '../types';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { DEFAULT_CATEGORIES } from '../config/categories';

export default function Expenses() {
  const { state, addExpense, updateExpense, deleteExpense, formatMoney } = useAppState();
  const [showForm, setShowForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editingExpense, setEditingExpense] = useState<ExpenseType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Combine default and custom categories, filtering out disabled default categories
  const allCategories = [
    ...DEFAULT_CATEGORIES.filter((cat: string) => !(state.settings.disabledDefaultCategories || []).includes(cat)),
    ...(state.settings.customCategories || []).map((cat: { name: string }) => cat.name)
  ];

  let filteredExpenses: ExpenseType[];

  // Apply search query filter globally (not just current month)
  if (searchQuery) {
    filteredExpenses = state.expenses.filter((expense: ExpenseType) => 
      expense.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  } else {
    // Filter by month and category only if no search query is present
    filteredExpenses = state.expenses.filter((expense: ExpenseType) => 
      expense.date.startsWith(selectedMonth)
    );
    if (selectedCategory !== 'All') {
      filteredExpenses = filteredExpenses.filter((expense: ExpenseType) => expense.category === selectedCategory);
    }
  }

  // Sort by latest date first
  filteredExpenses = filteredExpenses.sort((a, b) => b.date.localeCompare(a.date));

  // Calculate total expenses for selected month
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const expenseData: ExpenseType = {
      id: editingExpense?.id || crypto.randomUUID(),
      amount: parseFloat(formData.get('amount') as string) || 0,
      category: formData.get('category') as string,
      date: formData.get('date') as string,
      note: (formData.get('note') as string) || undefined,
      accountType: formData.get('accountType') as 'credit' | 'debit',
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

  const handleEdit = (expense: ExpenseType) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleDelete = (expenseId: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        deleteExpense(expenseId);
        setShowForm(false);
        setEditingExpense(null);
      } catch (error) {
        console.error('Failed to delete expense:', error);
        alert('Failed to delete expense. Please try again.');
      }
    }
  };

  // Helper for today's date in yyyy-mm-dd
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center mb-6">
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
                defaultValue={editingExpense?.category}
              >
                {allCategories.map(category => (
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
                defaultValue={editingExpense?.date || today}
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

            <div>
              <label className="block text-sm font-medium mb-1">
                Account Type
              </label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="accountType"
                    value="credit"
                    required
                    defaultChecked={editingExpense ? editingExpense.accountType === 'credit' : true}
                  />
                  Credit
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="accountType"
                    value="debit"
                    required
                    defaultChecked={editingExpense ? editingExpense.accountType === 'debit' : false}
                  />
                  Debit
                </label>
              </div>
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
            {editingExpense && (
              <button
                type="button"
                onClick={() => handleDelete(editingExpense.id)}
                className="btn bg-red-600 hover:bg-red-700 text-white w-full flex items-center justify-center gap-2 mt-6"
              >
                <FaTrash /> Delete Expense
              </button>
            )}
          </form>
        </div>
      )}

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search expenses by note or category..."
        className="input mb-4"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Month Filter */}
      <div className="flex gap-4 items-center">
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="input"
        />
        <select
          className="input"
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          {allCategories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
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
        {filteredExpenses.map((expense: ExpenseType) => (
          <div key={expense.id} className="card">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium dark:text-white">{expense.category}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(expense.date).toLocaleDateString()}
                  {expense.note && ` - ${expense.note}`}
                  {` - ${(expense.accountType ? expense.accountType.charAt(0).toUpperCase() + expense.accountType.slice(1) : 'N/A')}`}
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
                  title="Edit"
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