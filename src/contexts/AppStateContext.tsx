import React, { createContext, useReducer } from 'react';
import type { AppState, Expense, Goal, Investment, Settings, Income } from '../types';

interface AppStateContextType {
  state: AppState;
  setState: (newState: AppState) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (updatedExpense: Expense) => void;
  addGoal: (goal: Goal) => void;
  addInvestment: (investment: Investment) => void;
  updateSettings: (settings: Settings) => void;
  clearData: () => void;
  formatMoney: (amount: number) => string;
  addIncome: (income: Income) => void;
  updateIncome: (updatedIncome: Income) => void;
  deleteIncome: (incomeId: string) => void;
  calculateCurrentMonthIncome: (incomes: Income[]) => number;
}

type Action =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'ADD_GOAL'; payload: Goal }
  | { type: 'ADD_INVESTMENT'; payload: Investment }
  | { type: 'UPDATE_SETTINGS'; payload: Settings }
  | { type: 'CLEAR_DATA' }
  | { type: 'ADD_INCOME'; payload: Income }
  | { type: 'UPDATE_INCOME'; payload: Income }
  | { type: 'DELETE_INCOME'; payload: string };

const initialState: AppState = {
  expenses: [],
  goals: [],
  investments: [],
  settings: {
    monthlyIncome: 0,
    currency: 'SAR',
    darkMode: true,
    customCategories: [],
    disabledDefaultCategories: []
  },
  incomes: []
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;
    case 'ADD_EXPENSE':
      return {
        ...state,
        expenses: [...state.expenses, action.payload]
      };
    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.map(expense =>
          expense.id === action.payload.id ? action.payload : expense
        )
      };
    case 'ADD_GOAL':
      return {
        ...state,
        goals: [...state.goals, action.payload]
      };
    case 'ADD_INVESTMENT':
      return {
        ...state,
        investments: [...state.investments, action.payload]
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: action.payload
      };
    case 'CLEAR_DATA':
      return initialState;
    case 'ADD_INCOME':
      return {
        ...state,
        incomes: [...state.incomes, action.payload]
      };
    case 'UPDATE_INCOME':
      return {
        ...state,
        incomes: state.incomes.map(income =>
          income.id === action.payload.id ? action.payload : income
        )
      };
    case 'DELETE_INCOME':
      return {
        ...state,
        incomes: state.incomes.filter(income => income.id !== action.payload)
      };
    default:
      return state;
  }
}

export const AppStateContext = createContext<AppStateContextType | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setState = (newState: AppState) => {
    dispatch({ type: 'SET_STATE', payload: newState });
  };

  const addExpense = (expense: Expense) => {
    dispatch({ type: 'ADD_EXPENSE', payload: expense });
  };

  const updateExpense = (updatedExpense: Expense) => {
    dispatch({ type: 'UPDATE_EXPENSE', payload: updatedExpense });
  };

  const addGoal = (goal: Goal) => {
    dispatch({ type: 'ADD_GOAL', payload: goal });
  };

  const addInvestment = (investment: Investment) => {
    dispatch({ type: 'ADD_INVESTMENT', payload: investment });
  };

  const updateSettings = (settings: Settings) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  };

  const clearData = () => {
    dispatch({ type: 'CLEAR_DATA' });
  };

  const addIncome = (income: Income) => {
    dispatch({ type: 'ADD_INCOME', payload: income });
  };

  const updateIncome = (updatedIncome: Income) => {
    dispatch({ type: 'UPDATE_INCOME', payload: updatedIncome });
  };

  const deleteIncome = (incomeId: string) => {
    dispatch({ type: 'DELETE_INCOME', payload: incomeId });
  };

  const formatMoney = (amount: number) => {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const calculateCurrentMonthIncome = (incomes: Income[]) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    return incomes.reduce((total, income) => {
      const incomeDate = new Date(income.date);
      
      if (income.frequency === 'Monthly' && income.isRecurring) {
        return total + income.amount;
      }
      
      if (income.frequency === 'One-time' &&
          incomeDate.getMonth() === currentMonth &&
          incomeDate.getFullYear() === currentYear) {
        return total + income.amount;
      }
      
      if (income.frequency === 'Weekly' && income.isRecurring) {
        return total + (income.amount * 4); // Approximate monthly amount
      }
      
      if (income.frequency === 'Yearly' && income.isRecurring) {
        return total + (income.amount / 12); // Monthly equivalent
      }
      
      return total;
    }, 0);
  };

  return (
    <AppStateContext.Provider value={{
      state,
      setState,
      addExpense,
      updateExpense,
      addGoal,
      addInvestment,
      updateSettings,
      clearData,
      formatMoney,
      addIncome,
      updateIncome,
      deleteIncome,
      calculateCurrentMonthIncome
    }}>
      {children}
    </AppStateContext.Provider>
  );
} 