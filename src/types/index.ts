import { Category } from '../config/categories';

export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
  accountType: 'credit' | 'debit';
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
  note?: string;
  contributions?: Contribution[];
}

// Legacy investment format (for migration detection only)
export interface LegacyInvestment {
  id: string;
  name: string;
  amount: number;
  currentValue?: number;
  category?: string;
  notes?: string;
  date: string;
}

// New investment lot — each purchase is tracked individually
export interface InvestmentLot {
  id: string;
  positionKey: string;        // Groups lots together (e.g., "aapl" or "gold-24k")
  name: string;               // Display name ("Apple Inc.", "Gold 24k")
  ticker?: string;            // For API lookup ("AAPL", "NVDA")
  category: string;           // From INVESTMENT_CATEGORIES
  quantity: number;           // 50 shares, 20 grams, etc.
  pricePerUnit: number;       // Price paid per unit
  unitType: string;           // "shares", "grams", "units", "coins"
  date: string;
  notes?: string;
  manualCurrentValue?: number;    // Manual override for lot value
  useManualValuation?: boolean;   // true = skip API, use manual value
}

export interface PriceCacheEntry {
  price: number;
  currency: string;
  lastUpdated: string;
  source: string;
}

export interface PriceCache {
  [ticker: string]: PriceCacheEntry;
}

// Computed position view — derived from grouping lots, never stored
export interface Position {
  positionKey: string;
  name: string;
  ticker?: string;
  category: string;
  unitType: string;
  totalQuantity: number;
  avgCostBasis: number;
  totalInvested: number;
  currentPricePerUnit?: number;
  currentValue?: number;
  returnAmount?: number;
  returnPercentage?: number;
  lots: InvestmentLot[];
  useManualValuation: boolean;
}

export interface Settings {
  monthlyIncome: number;
  currency: string;
  darkMode: boolean;
  customCategories: Category[];
  alphaVantageApiKey?: string;
  categoryBudgets?: Record<string, number>;
  disabledDefaultCategories?: string[];
}

export interface AppState {
  expenses: Expense[];
  goals: Goal[];
  investments: InvestmentLot[];
  settings: Settings;
  incomes: Income[];
  priceCache?: PriceCache;
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
