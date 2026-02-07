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

export function createCategory(name: string): Category {
  return {
    id: crypto.randomUUID(),
    name,
    isCustom: true
  };
} 