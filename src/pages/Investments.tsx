import { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { Investment } from '../types';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

export default function Investments() {
  const { state, addInvestment, updateInvestment, deleteInvestment } = useAppState();
  const [showForm, setShowForm] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const investmentData: Investment = {
      id: editingInvestment?.id || crypto.randomUUID(),
      name: formData.get('name') as string,
      amount: parseFloat(formData.get('amount') as string),
      currentValue: formData.get('currentValue') ? 
        parseFloat(formData.get('currentValue') as string) : undefined,
      notes: formData.get('notes') as string || undefined,
      date: editingInvestment?.date || new Date().toISOString()
    };

    if (editingInvestment) {
      updateInvestment(investmentData);
      setEditingInvestment(null);
    } else {
      addInvestment(investmentData);
    }

    setShowForm(false);
    form.reset();
  };

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setShowForm(true);
  };

  const handleDelete = (investmentId: string) => {
    if (window.confirm('Are you sure you want to delete this investment?')) {
      try {
        deleteInvestment(investmentId);
        setShowForm(false);
        setEditingInvestment(null);
      } catch (error) {
        console.error('Failed to delete investment:', error);
        alert('Failed to delete investment. Please try again.');
      }
    }
  };

  const calculateReturn = (investment: Investment) => {
    if (!investment.currentValue) return null;
    const returnAmount = investment.currentValue - investment.amount;
    const returnPercentage = (returnAmount / investment.amount) * 100;
    return { amount: returnAmount, percentage: returnPercentage };
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6 pb-20">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold dark:text-white">Investments</h1>
            <button
              onClick={() => {
                setEditingInvestment(null);
                setShowForm(!showForm);
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <FaPlus /> Add Investment
            </button>
          </div>

          {/* Add Investment Form */}
          {showForm && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">
                {editingInvestment ? 'Edit Investment' : 'Add New Investment'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    Investment Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    className="input mt-1"
                    defaultValue={editingInvestment?.name}
                  />
                </div>

                <div>
                  <label htmlFor="amount" className="block text-sm font-medium mb-1">
                    Initial Amount ({state.settings.currency})
                  </label>
                  <input
                    type="number"
                    name="amount"
                    id="amount"
                    required
                    min="0"
                    step="0.01"
                    className="input mt-1"
                    defaultValue={editingInvestment?.amount}
                  />
                </div>

                <div>
                  <label htmlFor="currentValue" className="block text-sm font-medium mb-1">
                    Current Value ({state.settings.currency}) (Optional)
                  </label>
                  <input
                    type="number"
                    name="currentValue"
                    id="currentValue"
                    min="0"
                    step="0.01"
                    className="input mt-1"
                    defaultValue={editingInvestment?.currentValue}
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    id="notes"
                    className="input mt-1"
                    rows={3}
                    defaultValue={editingInvestment?.notes}
                  />
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary flex-1">
                    {editingInvestment ? 'Save Changes' : 'Add Investment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingInvestment(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
                {editingInvestment && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingInvestment.id)}
                    className="btn bg-red-600 hover:bg-red-700 text-white w-full flex items-center justify-center gap-2 mt-6"
                  >
                    <FaTrash /> Delete Investment
                  </button>
                )}
              </form>
            </div>
          )}

          {/* Investments List */}
          <div className="space-y-4">
            {state.investments.map(investment => {
              const returns = calculateReturn(investment);
              return (
                <div key={investment.id} className="card">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium dark:text-white">{investment.name}</h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Started {new Date(investment.date).toLocaleDateString()}
                      </div>
                      {investment.notes && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          {investment.notes}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold dark:text-white">
                        {state.settings.currency} {investment.amount.toFixed(2)}
                      </div>
                      {investment.currentValue && (
                        <div className={`text-sm ${
                          returns && returns.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          Current: {state.settings.currency} {investment.currentValue.toFixed(2)}
                          <br />
                          {returns ? (
                            <>
                              {returns.percentage.toFixed(2)}% ({returns.amount >= 0 ? '+' : ''}
                              {state.settings.currency} {returns.amount.toFixed(2)})
                            </>
                          ) : (
                            'No returns data available'
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => handleEdit(investment)}
                        className="btn btn-secondary p-2"
                      >
                        <FaEdit />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {state.investments.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400">
                No investments yet. Add one to start tracking!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 