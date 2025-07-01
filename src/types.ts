import { Category } from './config/categories';

export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
  accountType: 'credit' | 'debit';
}

export interface Investment {
  id: string;
  name: string;
  amount: number;
  currentValue?: number;
  notes?: string;
  date: string;
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

export interface Settings {
  monthlyIncome?: number;
  currency: string;
  darkMode: boolean;
  customCategories: Category[];
  disabledDefaultCategories?: string[];
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