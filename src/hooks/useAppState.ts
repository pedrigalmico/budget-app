import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Expense, Goal, InvestmentLot, Settings, Income, PriceCache } from '../types';
import { useFirestore } from './useFirestore';
import { useLoading } from '../contexts/LoadingContext';

export const useAppState = () => {
  const { data: firestoreData, updateData } = useFirestore();
  const { setIsLoading } = useLoading();
  const [state, setState] = useState<AppState>(() => ({
    expenses: [],
    goals: [],
    investments: [],
    incomes: [],
    settings: {
      monthlyIncome: 0,
      currency: 'SAR',
      darkMode: false,
      customCategories: [],
      categoryBudgets: {},
      usdToSarRate: 3.75
    }
  }));

  const pendingUpdates = useRef<NodeJS.Timeout | null>(null);
  const pendingData = useRef<AppState | null>(null);

  // Update local state when Firestore data changes
  useEffect(() => {
    if (firestoreData) {
      setState(firestoreData);
    }
  }, [firestoreData]);

  // Debounced state update function
  const updateState = useCallback((newState: AppState) => {
    // Update local state immediately
    setState(newState);

    // Store the pending data
    pendingData.current = newState;

    // Clear any pending update
    if (pendingUpdates.current) {
      clearTimeout(pendingUpdates.current);
    }

    // Start loading state
    setIsLoading(true);

    // Schedule Firestore update
    pendingUpdates.current = setTimeout(async () => {
      try {
        if (pendingData.current) {
          await updateData(pendingData.current);
        }
      } finally {
        setIsLoading(false);
        pendingData.current = null;
      }
    }, 2000);
  }, [updateData, setIsLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pendingUpdates.current) {
        clearTimeout(pendingUpdates.current);
        setIsLoading(false);
        pendingData.current = null;
      }
    };
  }, [setIsLoading]);

  const calculateCurrentMonthIncome = (incomes: Income[]): number => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return incomes.reduce((total, income) => {
      const incomeDate = new Date(income.date);

      if (income.isRecurring && income.frequency === 'Monthly') {
        return total + income.amount;
      }

      if (income.frequency === 'One-time' &&
          incomeDate >= startOfMonth &&
          incomeDate <= endOfMonth) {
        return total + income.amount;
      }

      if (income.frequency === 'Weekly' && income.isRecurring) {
        return total + (income.amount * 4);
      }

      if (income.frequency === 'Yearly' && income.isRecurring) {
        return total + (income.amount / 12);
      }

      return total;
    }, 0);
  };

  // ── Expenses ──────────────────────────────────────────────────────

  const addExpense = (expense: Expense) => {
    updateState({
      ...state,
      expenses: [...state.expenses, expense]
    });
  };

  const updateExpense = (updatedExpense: Expense) => {
    updateState({
      ...state,
      expenses: state.expenses.map(expense =>
        expense.id === updatedExpense.id ? updatedExpense : expense
      )
    });
  };

  const deleteExpense = (expenseId: string) => {
    try {
      updateState({
        ...state,
        expenses: state.expenses.filter(expense => expense.id !== expenseId)
      });
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  // ── Goals ─────────────────────────────────────────────────────────

  const addGoal = (goal: Goal) => {
    updateState({
      ...state,
      goals: [...state.goals, goal]
    });
  };

  const updateGoal = (updatedGoal: Goal) => {
    updateState({
      ...state,
      goals: state.goals.map(goal =>
        goal.id === updatedGoal.id ? updatedGoal : goal
      )
    });
  };

  const deleteGoal = (goalId: string) => {
    try {
      updateState({
        ...state,
        goals: state.goals.filter(goal => goal.id !== goalId)
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  // ── Investments (lot-based) ───────────────────────────────────────

  const addInvestmentLot = (lot: InvestmentLot) => {
    updateState({
      ...state,
      investments: [...state.investments, lot]
    });
  };

  const updateInvestmentLot = (updatedLot: InvestmentLot) => {
    updateState({
      ...state,
      investments: state.investments.map(lot =>
        lot.id === updatedLot.id ? updatedLot : lot
      )
    });
  };

  const deleteInvestmentLot = (lotId: string) => {
    try {
      updateState({
        ...state,
        investments: state.investments.filter(lot => lot.id !== lotId)
      });
    } catch (error) {
      console.error('Error deleting investment lot:', error);
    }
  };

  const updatePositionDetails = (positionKey: string, updates: { name?: string; ticker?: string }) => {
    updateState({
      ...state,
      investments: state.investments.map(lot =>
        lot.positionKey === positionKey
          ? { ...lot, ...updates, ticker: updates.ticker || undefined }
          : lot
      )
    });
  };

  const deletePosition = (positionKey: string) => {
    try {
      updateState({
        ...state,
        investments: state.investments.filter(lot => lot.positionKey !== positionKey)
      });
    } catch (error) {
      console.error('Error deleting position:', error);
    }
  };

  const updatePriceCache = (priceCache: PriceCache) => {
    updateState({
      ...state,
      priceCache
    });
  };

  // ── Income ────────────────────────────────────────────────────────

  const addIncome = (income: Income) => {
    updateState({
      ...state,
      incomes: [...state.incomes, income]
    });
  };

  const updateIncome = (updatedIncome: Income) => {
    updateState({
      ...state,
      incomes: state.incomes.map(income =>
        income.id === updatedIncome.id ? updatedIncome : income
      )
    });
  };

  const deleteIncome = (incomeId: string) => {
    try {
      updateState({
        ...state,
        incomes: state.incomes.filter(income => income.id !== incomeId)
      });
    } catch (error) {
      console.error('Error deleting income:', error);
    }
  };

  // ── Settings ──────────────────────────────────────────────────────

  const updateSettings = (settings: Settings) => {
    updateState({
      ...state,
      settings
    });
  };

  const defaultState: AppState = {
    expenses: [],
    goals: [],
    investments: [],
    incomes: [],
    settings: {
      monthlyIncome: 0,
      currency: 'SAR',
      darkMode: false,
      customCategories: [],
      categoryBudgets: {},
      usdToSarRate: 3.75
    }
  };

  const clearData = () => {
    updateData(defaultState);
    setState(defaultState);
  };

  // ── Derived values ────────────────────────────────────────────────

  const getAvailableBalance = () => {
    const currentMonthIncome = calculateCurrentMonthIncome(state.incomes);
    const totalExpenses = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    return currentMonthIncome - totalExpenses;
  };

  const getMonthlySpending = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return state.expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth &&
               expenseDate.getFullYear() === currentYear;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  // ── Formatting ────────────────────────────────────────────────────

  const formatMoney = (amount: number): string => {
    const safeAmount = isNaN(amount) || !isFinite(amount) ? 0 : amount;
    return safeAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return {
    state,
    // Expenses
    addExpense,
    updateExpense,
    deleteExpense,
    // Goals
    addGoal,
    updateGoal,
    deleteGoal,
    // Investments (lot-based)
    addInvestmentLot,
    updateInvestmentLot,
    deleteInvestmentLot,
    deletePosition,
    updatePositionDetails,
    updatePriceCache,
    // Income
    addIncome,
    updateIncome,
    deleteIncome,
    // Settings
    updateSettings,
    clearData,
    // Derived
    getAvailableBalance,
    getMonthlySpending,
    calculateCurrentMonthIncome,
    formatMoney,
  };
};
