import type { Category } from '~/types';

export const MONTHLY_BUDGET = 2500;

export const CATEGORY_BUDGETS: Partial<Record<Category, number>> = {
  groceries: 450,
  dining: 250,
  transport: 180,
  entertainment: 200,
  utilities: 320,
  shopping: 280,
  health: 160,
};
