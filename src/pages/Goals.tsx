import { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { Goal, Contribution } from '../types';
import { FaPlus, FaEdit, FaPiggyBank, FaTrash, FaChevronDown, FaChevronUp, FaTimes, FaMinus } from 'react-icons/fa';

export default function Goals() {
  const { state, addGoal, updateGoal, formatMoney, deleteGoal } = useAppState();
  const [showForm, setShowForm] = useState(false);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [editingContribution, setEditingContribution] = useState<{ goalId: string; index: number; contribution: Contribution } | null>(null);
  const [contributionType, setContributionType] = useState<'deposit' | 'withdrawal'>('deposit');

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
      note: formData.get('note') as string || undefined,
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

    const rawAmount = parseFloat(formData.get('amount') as string);
    const contributionAmount = contributionType === 'withdrawal' ? -rawAmount : rawAmount;
    const contributionDate = formData.get('date') as string;
    const contributionNote = formData.get('note') as string || undefined;

    if (editingContribution) {
      // Editing existing contribution
      const oldAmount = editingContribution.contribution.amount;
      const amountDifference = contributionAmount - oldAmount;
      const updatedContributions = [...(selectedGoal.contributions || [])];
      updatedContributions[editingContribution.index] = {
        amount: contributionAmount,
        date: contributionDate,
        note: contributionNote
      };

      const updatedGoal: Goal = {
        ...selectedGoal,
        currentAmount: selectedGoal.currentAmount + amountDifference,
        contributions: updatedContributions
      };

      updateGoal(updatedGoal);
      setEditingContribution(null);
    } else {
      // Adding new contribution
      const newCurrentAmount = selectedGoal.currentAmount + contributionAmount;

      const updatedGoal: Goal = {
        ...selectedGoal,
        currentAmount: newCurrentAmount,
        contributions: [
          ...(selectedGoal.contributions || []),
          {
            amount: contributionAmount,
            date: contributionDate,
            note: contributionNote
          }
        ]
      };

      updateGoal(updatedGoal);
    }

    setShowContributionForm(false);
    setSelectedGoal(null);
    setContributionType('deposit');
    form.reset();
  };

  const handleDeleteContribution = (goal: Goal, contributionIndex: number) => {
    if (!window.confirm('Are you sure you want to delete this contribution?')) return;

    const contribution = goal.contributions![contributionIndex];
    const updatedContributions = goal.contributions!.filter((_, i) => i !== contributionIndex);

    const updatedGoal: Goal = {
      ...goal,
      currentAmount: goal.currentAmount - contribution.amount,
      contributions: updatedContributions
    };

    updateGoal(updatedGoal);
  };

  const handleEditContribution = (goal: Goal, contributionIndex: number) => {
    const contribution = goal.contributions![contributionIndex];
    setSelectedGoal(goal);
    setContributionType(contribution.amount < 0 ? 'withdrawal' : 'deposit');
    setEditingContribution({ goalId: goal.id, index: contributionIndex, contribution });
    setShowContributionForm(true);
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

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
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

              <div>
                <label htmlFor="note" className="block text-sm font-medium mb-1">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  name="note"
                  id="note"
                  className="input mt-1"
                  placeholder="e.g., Summer 2026 vacation"
                  defaultValue={editingGoal?.note}
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
            const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
            const isExpanded = expandedGoalId === goal.id;
            const contributionCount = goal.contributions?.length || 0;

            return (
              <div key={goal.id} className="card">
                {/* Goal Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg dark:text-white">{goal.name}</h3>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Started {new Date(goal.date).toLocaleDateString()}
                    </div>
                    {goal.note && (
                      <div className="text-sm text-gray-500 mt-1">{goal.note}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedGoal(goal);
                        setEditingContribution(null);
                        setContributionType('deposit');
                        setShowContributionForm(true);
                      }}
                      className="btn btn-primary p-2"
                      title="Add contribution"
                    >
                      <FaPiggyBank />
                    </button>
                    <button
                      onClick={() => handleEdit(goal)}
                      className="btn btn-secondary p-2"
                      title="Edit goal"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </div>

                {/* Progress Section */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end text-sm">
                    <div>
                      <span className="text-2xl font-bold dark:text-white">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400 text-xs">
                        {state.settings.currency} {formatMoney(goal.currentAmount)} of {formatMoney(goal.targetAmount)}
                      </div>
                      {remaining > 0 && (
                        <div className="text-gray-500 text-xs">
                          {state.settings.currency} {formatMoney(remaining)} remaining
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(progress)} transition-all duration-500 rounded-full`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {progress >= 100 && (
                    <div className="text-green-400 text-sm font-medium text-center mt-1">
                      Goal reached!
                    </div>
                  )}
                </div>

                {/* Contributions Section */}
                {contributionCount > 0 && (
                  <div className="mt-4 border-t border-gray-700 pt-3">
                    <button
                      onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                      className="flex items-center justify-between w-full text-sm text-gray-300 hover:text-white transition-colors"
                    >
                      <span className="font-medium">
                        Transactions ({contributionCount})
                      </span>
                      {isExpanded ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
                    </button>

                    {/* Always show last 2 contributions when collapsed */}
                    {!isExpanded && (
                      <div className="mt-2 space-y-1.5">
                        {goal.contributions!.slice(-2).reverse().map((contribution: Contribution, idx: number) => {
                          const actualIndex = goal.contributions!.length - 1 - idx;
                          return (
                            <div key={actualIndex} className="flex items-center justify-between text-sm bg-gray-800/50 rounded-lg px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 text-xs">{new Date(contribution.date).toLocaleDateString()}</span>
                                  {contribution.note && (
                                    <span className="text-gray-500 text-xs truncate">- {contribution.note}</span>
                                  )}
                                </div>
                              </div>
                              <span className={`${contribution.amount < 0 ? 'text-red-400' : 'text-green-400'} font-medium ml-3`}>
                                {contribution.amount < 0 ? '-' : '+'}{state.settings.currency} {formatMoney(Math.abs(contribution.amount))}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Expanded: show all contributions with edit/delete */}
                    {isExpanded && (
                      <div className="mt-2 space-y-1.5">
                        {[...goal.contributions!].reverse().map((contribution: Contribution, reverseIdx: number) => {
                          const actualIndex = goal.contributions!.length - 1 - reverseIdx;
                          return (
                            <div key={actualIndex} className="flex items-center justify-between text-sm bg-gray-800/50 rounded-lg px-3 py-2 group">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 text-xs">{new Date(contribution.date).toLocaleDateString()}</span>
                                  {contribution.note && (
                                    <span className="text-gray-500 text-xs truncate">- {contribution.note}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                <span className={`${contribution.amount < 0 ? 'text-red-400' : 'text-green-400'} font-medium`}>
                                  {contribution.amount < 0 ? '-' : '+'}{state.settings.currency} {formatMoney(Math.abs(contribution.amount))}
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditContribution(goal, actualIndex)}
                                    className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                                    title="Edit contribution"
                                  >
                                    <FaEdit className="text-xs" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteContribution(goal, actualIndex)}
                                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                    title="Delete contribution"
                                  >
                                    <FaTrash className="text-xs" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {state.goals.length === 0 && (
            <div className="text-center py-12">
              <FaPiggyBank className="text-5xl text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No savings goals yet</p>
              <p className="text-gray-500 text-sm mt-1">Add a goal to start tracking your savings!</p>
            </div>
          )}
        </div>

        {/* Contribution Form Modal */}
        {showContributionForm && selectedGoal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="card w-full max-w-md relative">
              <button
                onClick={() => {
                  setShowContributionForm(false);
                  setSelectedGoal(null);
                  setEditingContribution(null);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes />
              </button>
              <h2 className="text-lg font-semibold mb-1 dark:text-white">
                {editingContribution ? 'Edit Entry' : contributionType === 'deposit' ? 'Add Deposit' : 'Record Withdrawal'}
              </h2>
              <p className="text-sm text-gray-400 mb-4">{selectedGoal.name}</p>
              <form onSubmit={handleContribution} className="space-y-4">
                {/* Deposit / Withdrawal Toggle */}
                <div className="flex rounded-lg overflow-hidden border border-gray-600">
                  <button
                    type="button"
                    onClick={() => setContributionType('deposit')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      contributionType === 'deposit'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <FaPlus className="text-xs" /> Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => setContributionType('withdrawal')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      contributionType === 'withdrawal'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <FaMinus className="text-xs" /> Withdrawal
                  </button>
                </div>

                <div>
                  <label htmlFor="contribution-amount" className="block text-sm font-medium mb-1">
                    Amount ({state.settings.currency})
                  </label>
                  <input
                    type="number"
                    name="amount"
                    id="contribution-amount"
                    required
                    min="0.01"
                    step="0.01"
                    className="input"
                    placeholder={contributionType === 'deposit' ? 'Enter deposit amount' : 'Enter withdrawal amount'}
                    defaultValue={editingContribution ? Math.abs(editingContribution.contribution.amount) : undefined}
                  />
                </div>

                <div>
                  <label htmlFor="contribution-date" className="block text-sm font-medium mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    id="contribution-date"
                    required
                    className="input"
                    defaultValue={editingContribution?.contribution.date || new Date().toISOString().slice(0, 10)}
                  />
                </div>

                <div>
                  <label htmlFor="contribution-note" className="block text-sm font-medium mb-1">
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    name="note"
                    id="contribution-note"
                    className="input"
                    placeholder="Add a note for this contribution"
                    defaultValue={editingContribution?.contribution.note}
                  />
                </div>

                <div className="flex gap-2">
                  <button type="submit" className={`btn flex-1 text-white ${contributionType === 'withdrawal' ? 'bg-red-600 hover:bg-red-700' : 'btn-primary'}`}>
                    {editingContribution ? 'Save Changes' : contributionType === 'deposit' ? 'Add Deposit' : 'Record Withdrawal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowContributionForm(false);
                      setSelectedGoal(null);
                      setEditingContribution(null);
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
  );
}
