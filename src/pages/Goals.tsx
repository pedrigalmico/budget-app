import { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { Goal, Contribution } from '../types';
import { FaPlus, FaEdit, FaPiggyBank, FaTrash } from 'react-icons/fa';

export default function Goals() {
  const { state, addGoal, updateGoal, formatMoney, deleteGoal } = useAppState();
  const [showForm, setShowForm] = useState(false);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const goalData: Goal = {
      id: editingGoal?.id || crypto.randomUUID(),
      name: formData.get('name') as string,
      targetAmount: parseFloat(formData.get('targetAmount') as string),
      currentAmount: parseFloat(formData.get('currentAmount') as string),
      date: editingGoal?.date || new Date().toISOString(),
      contributions: editingGoal?.contributions || []
    };

    if (editingGoal) {
      updateGoal(goalData);
      setEditingGoal(null);
    } else {
      addGoal(goalData);
    }
    
    setShowForm(false);
    form.reset();
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleContribution = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    if (!selectedGoal) return;

    const contributionAmount = parseFloat(formData.get('amount') as string);
    const newCurrentAmount = selectedGoal.currentAmount + contributionAmount;
    
    const updatedGoal: Goal = {
      ...selectedGoal,
      currentAmount: newCurrentAmount,
      contributions: [
        ...(selectedGoal.contributions || []),
        {
          amount: contributionAmount,
          date: formData.get('date') as string,
          note: formData.get('note') as string || undefined
        }
      ]
    };

    updateGoal(updatedGoal);
    setShowContributionForm(false);
    setSelectedGoal(null);
    form.reset();
  };

  const handleDelete = (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        deleteGoal(goalId);
        setShowForm(false);
        setEditingGoal(null);
      } catch (error) {
        console.error('Failed to delete goal:', error);
        alert('Failed to delete goal. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6 pb-20">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold dark:text-white">Savings Goals</h1>
            <button
              onClick={() => {
                setEditingGoal(null);
                setShowForm(!showForm);
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <FaPlus /> Add Goal
            </button>
          </div>

          {/* Add Goal Form */}
          {showForm && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">
                {editingGoal ? 'Edit Goal' : 'Add New Goal'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    className="input mt-1"
                    placeholder="e.g., Trip to Japan"
                    defaultValue={editingGoal?.name}
                  />
                </div>

                <div>
                  <label htmlFor="targetAmount" className="block text-sm font-medium mb-1">
                    Target Amount ({state.settings.currency})
                  </label>
                  <input
                    type="number"
                    name="targetAmount"
                    id="targetAmount"
                    required
                    min="0"
                    step="0.01"
                    className="input mt-1"
                    defaultValue={editingGoal?.targetAmount}
                  />
                </div>

                <div>
                  <label htmlFor="currentAmount" className="block text-sm font-medium mb-1">
                    Current Amount ({state.settings.currency})
                  </label>
                  <input
                    type="number"
                    name="currentAmount"
                    id="currentAmount"
                    required
                    min="0"
                    step="0.01"
                    className="input mt-1"
                    defaultValue={editingGoal?.currentAmount}
                  />
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary flex-1">
                    {editingGoal ? 'Save Changes' : 'Add Goal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingGoal(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
                {editingGoal && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingGoal.id)}
                    className="btn bg-red-600 hover:bg-red-700 text-white w-full flex items-center justify-center gap-2 mt-6"
                  >
                    <FaTrash /> Delete Goal
                  </button>
                )}
              </form>
            </div>
          )}

          {/* Goals List */}
          <div className="space-y-4">
            {state.goals.map(goal => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              return (
                <div key={goal.id} className="card">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-medium">{goal.name}</h3>
                      <div className="text-sm text-gray-400">
                        Started {new Date(goal.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedGoal(goal);
                          setShowContributionForm(true);
                        }}
                        className="btn btn-primary p-2"
                      >
                        <FaPiggyBank />
                      </button>
                      <button
                        onClick={() => handleEdit(goal)}
                        className="btn btn-secondary p-2"
                      >
                        <FaEdit />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress: {progress.toFixed(1)}%</span>
                      <span>
                        {state.settings.currency} {formatMoney(goal.currentAmount)} / {formatMoney(goal.targetAmount)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Show recent contributions if any */}
                  {goal.contributions && goal.contributions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Recent Contributions</h4>
                      <div className="space-y-2">
                        {goal.contributions.slice(-3).reverse().map((contribution: Contribution, idx: number) => (
                          <div key={idx} className="text-sm flex justify-between">
                            <span>{new Date(contribution.date).toLocaleDateString()}</span>
                            <span className="text-green-500">
                              +{state.settings.currency} {formatMoney(contribution.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {state.goals.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400">
                No savings goals yet. Add one to start tracking!
              </p>
            )}
          </div>

          {/* Contribution Form Modal */}
          {showContributionForm && selectedGoal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
              <div className="card w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">
                  Add Contribution to {selectedGoal.name}
                </h2>
                <form onSubmit={handleContribution} className="space-y-4">
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
                      placeholder="Enter contribution amount"
                    />
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
                      defaultValue={new Date().toISOString().slice(0, 10)}
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
                      placeholder="Add a note for this contribution"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" className="btn btn-primary flex-1">
                      Add Contribution
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowContributionForm(false);
                        setSelectedGoal(null);
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 