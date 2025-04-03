import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Expense, Goal, Investment, Settings, Income } from '../types';
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
      customCategories: []
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
    }, 2000); // 3 seconds delay
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

  const addExpense = (expense: Expense) => {
    updateState({
      ...state,
      expenses: [...state.expenses, expense]
    });
  };

  const addGoal = (goal: Goal) => {
    updateState({
      ...state,
      goals: [...state.goals, goal]
    });
  };

  const addInvestment = (investment: Investment) => {
    updateState({
      ...state,
      investments: [...state.investments, investment]
    });
  };

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
      customCategories: []
    }
  };

  const clearData = () => {
    updateData(defaultState); // Update Firestore with empty state
    setState(defaultState); // Reset local state to default values
  };

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

  const updateGoal = (updatedGoal: Goal) => {
    updateState({
      ...state,
      goals: state.goals.map(goal => 
        goal.id === updatedGoal.id ? updatedGoal : goal
      )
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

  const updateInvestment = (updatedInvestment: Investment) => {
    updateState({
      ...state,
      investments: state.investments.map(investment => 
        investment.id === updatedInvestment.id ? updatedInvestment : investment
      )
    });
  };

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

  // Add a helper function for number formatting
  const formatMoney = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return {
    state,
    addExpense,
    updateExpense,
    addGoal,
    addInvestment,
    updateSettings,
    clearData,
    getAvailableBalance,
    getMonthlySpending,
    updateGoal,
    updateInvestment,
    addIncome,
    updateIncome,
    formatMoney,
    calculateCurrentMonthIncome
  };
}; 