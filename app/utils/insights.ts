import type { Transaction, Category } from '~/types';
import { differenceInMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface InsightMessage {
  id: string;
  type: 'anomaly' | 'trend' | 'achievement' | 'warning';
  severity: 'success' | 'info' | 'warning' | 'danger';
  title: string;
  description: string;
  category?: Category;
  amount?: number;
}

/**
 * Detect anomalous transactions (unusually large purchases)
 */
export function detectAnomalies(transactions: Transaction[]): InsightMessage[] {
  const insights: InsightMessage[] = [];

  if (transactions.length < 3) return insights;

  const amounts = transactions.map((t) => Math.abs(t.amount));
  const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
  const stdDev = Math.sqrt(
    amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / amounts.length
  );

  // Find transactions that are >2.5 standard deviations from mean
  const threshold = avg + 2.5 * stdDev;

  const anomalousTransactions = transactions
    .filter((t) => Math.abs(t.amount) > threshold)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 2); // Top 2 anomalies

  for (const transaction of anomalousTransactions) {
    const deviation = (
      ((Math.abs(transaction.amount) - avg) / avg) *
      100
    ).toFixed(0);
    insights.push({
      id: `anomaly-${transaction.id}`,
      type: 'anomaly',
      severity: 'warning',
      title: `🔔 Unusual ${transaction.category} expense`,
      description: `${transaction.description.split('\n')[0]} (${Math.abs(
        transaction.amount
      ).toFixed(
        0
      )}) is ${deviation}% higher than your average. Make sure this was intended!`,
      category: transaction.category,
      amount: Math.abs(transaction.amount),
    });
  }

  return insights;
}

/**
 * Compare spending trends across months
 */
export function analyzeSpendingTrends(
  currentMonthTransactions: Transaction[],
  allTransactions: Transaction[]
): InsightMessage[] {
  const insights: InsightMessage[] = [];

  const now = new Date();
  const currentMonthStart = startOfMonth(now);

  // Get previous month's transactions
  const previousMonthTransactions = allTransactions.filter((t) => {
    const monthsDiff = differenceInMonths(currentMonthStart, t.date);
    return monthsDiff === 1;
  });

  if (previousMonthTransactions.length === 0) return insights;

  // Group by category for current and previous month
  const currentByCategory: Record<Category, number> = {} as Record<
    Category,
    number
  >;
  const previousByCategory: Record<Category, number> = {} as Record<
    Category,
    number
  >;

  currentMonthTransactions.forEach((t) => {
    if (t.amount < 0) {
      currentByCategory[t.category] =
        (currentByCategory[t.category] || 0) + Math.abs(t.amount);
    }
  });

  previousMonthTransactions.forEach((t) => {
    if (t.amount < 0) {
      previousByCategory[t.category] =
        (previousByCategory[t.category] || 0) + Math.abs(t.amount);
    }
  });

  // Find significant changes (>30% difference)
  const categories = new Set([
    ...Object.keys(currentByCategory),
    ...Object.keys(previousByCategory),
  ]) as Set<Category>;

  for (const category of categories) {
    const current = currentByCategory[category] || 0;
    const previous = previousByCategory[category] || 0;

    if (previous === 0 && current > 100) {
      insights.push({
        id: `trend-new-${category}`,
        type: 'trend',
        severity: 'info',
        title: `📊 New spending in ${category}`,
        description: `You started spending on ${category} this month (${current.toFixed(
          0
        )}). Is this expected?`,
        category,
        amount: current,
      });
      continue;
    }

    if (previous === 0) continue;

    const percentChange = ((current - previous) / previous) * 100;

    if (percentChange < -30) {
      insights.push({
        id: `trend-down-${category}`,
        type: 'achievement',
        severity: 'success',
        title: `🎉 Great job on ${category}!`,
        description: `You spent ${Math.abs(percentChange).toFixed(
          0
        )}% less on ${category} this month (${current.toFixed(
          0
        )} vs ${previous.toFixed(0)}). Keep it up!`,
        category,
        amount: previous - current,
      });
    } else if (percentChange > 50) {
      insights.push({
        id: `trend-up-${category}`,
        type: 'warning',
        severity: 'warning',
        title: `📈 ${category} spending increased`,
        description: `Your ${category} spending jumped ${percentChange.toFixed(
          0
        )}% (${current.toFixed(0)} vs ${previous.toFixed(
          0
        )} last month). Was this planned?`,
        category,
        amount: current - previous,
      });
    }
  }

  return insights;
}

/**
 * Detect if user is on track with their budget based on day of month
 */
export function analyzeBudgetPacing(
  daysElapsed: number,
  daysTotal: number,
  alreadySpent: number,
  totalBudget: number
): InsightMessage | null {
  const percentElapsed = daysElapsed / daysTotal;
  const expectedSpent = totalBudget * percentElapsed;
  const variance = alreadySpent - expectedSpent;
  const variancePercent = (variance / expectedSpent) * 100;

  if (variancePercent > 20) {
    return {
      id: 'pace-warning',
      type: 'warning',
      severity: 'danger',
      title: '⚠️ Spending too fast',
      description: `You're ${variancePercent.toFixed(
        0
      )}% ahead of pace. At this rate, you'll overspend by ${(
        alreadySpent / percentElapsed -
        totalBudget
      ).toFixed(0)} by month end.`,
      amount: variance,
    };
  } else if (variancePercent < -20) {
    return {
      id: 'pace-good',
      type: 'achievement',
      severity: 'success',
      title: '✅ Excellent pacing!',
      description: `You're ${Math.abs(variancePercent).toFixed(
        0
      )}% under pace. Keep this up and you'll have ${(
        totalBudget -
        alreadySpent / percentElapsed
      ).toFixed(0)} extra to save!`,
      amount: Math.abs(variance),
    };
  }

  return null;
}

/**
 * Generate insights from recurring payments
 */
export function generateRecurringInsights(
  recurring: Array<{
    merchant: string;
    amount: number;
    category: Category;
    frequency: string;
  }>
): InsightMessage[] {
  const insights: InsightMessage[] = [];

  // Show top 2 recurring payments as insights
  for (const payment of recurring.slice(0, 2)) {
    insights.push({
      id: `recurring-${payment.merchant}`,
      type: 'trend',
      severity: 'info',
      title: `🔄 ${payment.merchant}`,
      description: `${Math.abs(payment.amount).toFixed(0)} ${
        payment.frequency
      } recurring ${payment.amount < 0 ? 'expense' : 'income'} detected`,
      category: payment.category,
      amount: Math.abs(payment.amount),
    });
  }

  return insights;
}

/**
 * Generate insights from spending categories
 */
export function generateCategoryInsights(
  categoryStats: Array<{
    category: Category;
    total: number;
    percentage: number;
  }>
): InsightMessage[] {
  const insights: InsightMessage[] = [];

  if (categoryStats.length > 0) {
    const top = categoryStats[0];
    if (top) {
      insights.push({
        id: 'top-category',
        type: 'trend',
        severity: 'info',
        title: `📊 Top expense: ${
          top.category.charAt(0).toUpperCase() + top.category.slice(1)
        }`,
        description: `Your largest spending category is ${
          top.category
        } at ${top.total.toFixed(0)} (${top.percentage.toFixed(1)}%)`,
        category: top.category,
        amount: top.total,
      });
    }
  }

  return insights;
}
