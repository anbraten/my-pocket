import type { Category } from '~/types';

/**
 * Get monthly budget based on income (80% for expenses, 20% for savings)
 * Prioritizes recurring income, falls back to actual monthly income
 */
export const getMonthlyBudget = (
  monthlyIncome: number,
  recurringIncome?: number
) => {
  const baseIncome =
    recurringIncome && recurringIncome > 0 ? recurringIncome : monthlyIncome;
  return baseIncome * 0.8;
};
