import { AppState, Expense, Goal, Investment, Settings } from '../types';

const STORAGE_KEY = 'budgetApp';

const defaultSettings: Settings = {
  monthlyIncome: 0,
  monthlySpendingLimit: 0,
  currency: 'USD',
  darkMode: false,
};

const defaultState: AppState = {
  expenses: [],
  goals: [],
  investments: [],
  incomes: [],
  settings: defaultSettings,
};

export const loadState = (): AppState => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (!serializedState) return defaultState;
    return JSON.parse(serializedState);
  } catch (err) {
    console.error('Error loading state:', err);
    return defaultState;
  }
};

export const saveState = (state: AppState): void => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
  } catch (err) {
    console.error('Error saving state:', err);
  }
};

export const addExpense = (expense: Expense): void => {
  const state = loadState();
  state.expenses.push(expense);
  saveState(state);
};

export const addGoal = (goal: Goal): void => {
  const state = loadState();
  state.goals.push(goal);
  saveState(state);
};

export const addInvestment = (investment: Investment): void => {
  const state = loadState();
  state.investments.push(investment);
  saveState(state);
};

export const updateSettings = (settings: Settings): void => {
  const state = loadState();
  state.settings = settings;
  saveState(state);
};

export const clearData = (): void => {
  saveState(defaultState);
}; 