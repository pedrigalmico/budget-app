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

export function createCategory(name: string): Category {
  return {
    id: crypto.randomUUID(),
    name,
    isCustom: true
  };
} 