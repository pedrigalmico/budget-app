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

export type GoalType = 'savings' | 'funded_expense';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  date: string;
  note?: string;
  contributions?: Contribution[];
  goalType?: GoalType;
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
  pricePerUnit: number;       // Price paid per unit (in purchaseCurrency)
  unitType: string;           // "shares", "grams", "units", "coins"
  purchaseCurrency?: string;  // "USD" or "SAR" — currency the purchase was made in
  type?: 'buy' | 'sell';      // undefined = 'buy' (legacy lots predate sells)
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
  totalQuantity: number;      // Units still held (buys − sells)
  avgCostBasis: number;       // Average cost of the units still held
  totalInvested: number;      // Cost basis of the units still held (open basis)
  currentPricePerUnit?: number;
  currentValue?: number;
  returnAmount?: number;      // Unrealized: currentValue − totalInvested
  returnPercentage?: number;  // Unrealized, against open basis
  realizedReturn: number;     // Proceeds − cost basis removed, across all sells
  totalProceeds: number;      // Gross sale proceeds, in display currency
  totalCostSold: number;      // Cost basis removed by sells
  totalReturn?: number;       // realized + unrealized (undefined if no current price)
  isClosed: boolean;          // Every unit has been sold
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
  usdToSarRate?: number;  // USD to SAR exchange rate (default 3.75, pegged)
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
