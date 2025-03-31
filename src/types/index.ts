export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export interface Contribution {
  amount: number;
  date: string;
  note?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  date: string;
  contributions?: Contribution[];
}

export interface Investment {
  id: string;
  name: string;
  amount: number;
  currentValue?: number;
  notes?: string;
  date: string;
}

export interface Settings {
  monthlyIncome: number;
  monthlySpendingLimit: number;
  currency: string;
  darkMode: boolean;
}

export interface AppState {
  expenses: Expense[];
  goals: Goal[];
  investments: Investment[];
  settings: Settings;
  incomes: Income[];
}

export type IncomeType = 'Salary' | 'Freelance' | 'Investment' | 'Business' | 'Other';

export interface Income {
  id: string;
  name: string;
  amount: number;
  type: IncomeType;
  frequency: 'Monthly' | 'One-time' | 'Weekly' | 'Yearly';
  date: string;
  note?: string;
  isRecurring: boolean;
} 