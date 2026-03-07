export const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Health & Wellness',
  'Housing',
  'Education',
  'Travel',
  'Personal Care',
  'Gifts & Donations',
  'Insurance',
  'Remittances',
  'Investments',
  'Other'
];

export type Category = {
  id: string;
  name: string;
  isCustom?: boolean;
};

export const INVESTMENT_CATEGORIES = [
  'Stocks',
  'Bonds',
  'Real Estate / REITs',
  'Cryptocurrency',
  'Mutual Funds',
  'ETFs',
  'Savings / Fixed Deposit',
  'Gold / Commodities',
  'Business',
  'Other'
];

export const UNIT_TYPES: Record<string, string> = {
  'Stocks': 'shares',
  'Bonds': 'units',
  'Real Estate / REITs': 'units',
  'Cryptocurrency': 'coins',
  'Mutual Funds': 'units',
  'ETFs': 'shares',
  'Savings / Fixed Deposit': 'units',
  'Gold / Commodities': 'grams',
  'Business': 'units',
  'Other': 'units'
};

export function createCategory(name: string): Category {
  return {
    id: crypto.randomUUID(),
    name,
    isCustom: true
  };
} 