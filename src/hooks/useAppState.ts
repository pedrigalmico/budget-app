import { useState, useEffect } from 'react';
import { AppState, Expense, Goal, Investment, Settings, Income } from '../types';
import { useFirestore } from './useFirestore';

export const useAppState = () => {
  const { data: firestoreData, updateData } = useFirestore();
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

  // Update local state when Firestore data changes
  useEffect(() => {
    if (firestoreData) {
      setState(firestoreData);
    }
  }, [firestoreData]);

  // Save to Firestore when local state changes
  useEffect(() => {
    if (state !== firestoreData) {
      updateData(state);
    }
  }, [state, firestoreData, updateData]);

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
    setState(prev => ({
      ...prev,
      expenses: [...prev.expenses, expense]
    }));
  };

  const addGoal = (goal: Goal) => {
    setState(prev => ({
      ...prev,
      goals: [...prev.goals, goal]
    }));
  };

  const addInvestment = (investment: Investment) => {
    setState(prev => ({
      ...prev,
      investments: [...prev.investments, investment]
    }));
  };

  const updateSettings = (settings: Settings) => {
    setState(prev => ({
      ...prev,
      settings
    }));
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
    localStorage.removeItem('budgetApp'); // Remove data from localStorage
    setState(defaultState); // Reset state to default values
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
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(goal => 
        goal.id === updatedGoal.id ? updatedGoal : goal
      )
    }));
  };

  const updateExpense = (updatedExpense: Expense) => {
    setState(prev => ({
      ...prev,
      expenses: prev.expenses.map(expense => 
        expense.id === updatedExpense.id ? updatedExpense : expense
      )
    }));
  };

  const updateInvestment = (updatedInvestment: Investment) => {
    setState(prev => ({
      ...prev,
      investments: prev.investments.map(investment => 
        investment.id === updatedInvestment.id ? updatedInvestment : investment
      )
    }));
  };

  const addIncome = (income: Income) => {
    setState(prev => ({
      ...prev,
      incomes: [...prev.incomes, income]
    }));
  };

  const updateIncome = (updatedIncome: Income) => {
    setState(prev => ({
      ...prev,
      incomes: prev.incomes.map(income => 
        income.id === updatedIncome.id ? updatedIncome : income
      )
    }));
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