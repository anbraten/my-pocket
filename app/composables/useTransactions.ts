import { endOfMonth, startOfMonth } from 'date-fns';
import type {
  Transaction,
  Category,
  CategoryStats,
  Insight,
  RecurringPayment,
} from '~/types';
import { CATEGORY_KEYWORDS } from '~/utils/categories';

export const useTransactions = () => {
  const transactions = useState<Transaction[]>('transactions', () => []);

  // Load from localStorage on mount
  if (process.client) {
    const stored = localStorage.getItem('my-pocket-transactions');
    if (stored && transactions.value.length === 0) {
      const parsed = JSON.parse(stored);
      transactions.value = parsed.map((t: any) => ({
        ...t,
        date: new Date(t.date),
      }));
    }
  }

  // Save to localStorage
  const saveTransactions = () => {
    if (process.client) {
      localStorage.setItem(
        'my-pocket-transactions',
        JSON.stringify(transactions.value)
      );
    }
  };

  // Auto-categorize transaction based on description
  const categorizeTransaction = (description: string): Category => {
    const lowerDesc = description.toLowerCase();

    // Check if it's income
    if (
      lowerDesc.includes('deposit') ||
      lowerDesc.includes('salary') ||
      lowerDesc.includes('payroll')
    ) {
      return 'income';
    }

    // Check each category's keywords
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
      Category,
      string[]
    ][]) {
      if (
        keywords.some((keyword: string) =>
          lowerDesc.includes(keyword.toLowerCase())
        )
      ) {
        return category as Category;
      }
    }

    return 'other';
  };

  // Add transaction
  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    transactions.value.push(newTransaction);
    saveTransactions();
  };

  // Add multiple transactions (for CSV import)
  const addTransactions = (newTransactions: Omit<Transaction, 'id'>[]) => {
    const withIds = newTransactions.map((t) => ({
      ...t,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }));
    transactions.value.push(...withIds);
    saveTransactions();
  };

  // Update transaction category (for learning)
  const updateTransactionCategory = (id: string, category: Category) => {
    const transaction = transactions.value.find((t) => t.id === id);
    if (transaction) {
      transaction.category = category;
      saveTransactions();
    }
  };

  // Delete transaction
  const deleteTransaction = (id: string) => {
    transactions.value = transactions.value.filter((t) => t.id !== id);
    saveTransactions();
  };

  // Clear all transactions
  const clearAllTransactions = () => {
    transactions.value = [];
    saveTransactions();
  };

  // Get transactions sorted by date (newest first)
  const sortedTransactions = computed(() => {
    return [...transactions.value].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  });

  // Get expenses only (negative amounts)
  const expenses = computed(() => {
    return transactions.value.filter((t) => t.amount < 0);
  });

  // Get income only (positive amounts)
  const income = computed(() => {
    return transactions.value.filter((t) => t.amount > 0);
  });

  // Calculate category statistics
  const categoryStats = computed((): CategoryStats[] => {
    const expenseTransactions = expenses.value;
    const total = Math.abs(
      expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
    );

    const statsByCategory = expenseTransactions.reduce((acc, t) => {
      if (!acc[t.category]) {
        acc[t.category] = { total: 0, count: 0 };
      }
      acc[t.category].total += Math.abs(t.amount);
      acc[t.category].count += 1;
      return acc;
    }, {} as Record<Category, { total: number; count: number }>);

    return Object.entries(statsByCategory)
      .map(([category, stats]) => ({
        category: category as Category,
        total: stats.total,
        count: stats.count,
        average: stats.total / stats.count,
        percentage: total > 0 ? (stats.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  });

  const currentMonthRange = computed(() => {
    const now = new Date();
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
    };
  });

  const monthlyTransactions = computed(() => {
    const { start, end } = currentMonthRange.value;
    return transactions.value.filter((t) => t.date >= start && t.date <= end);
  });

  const monthlyExpenses = computed(() =>
    monthlyTransactions.value.filter((t) => t.amount < 0)
  );

  const monthlyIncome = computed(() =>
    monthlyTransactions.value.filter((t) => t.amount > 0)
  );

  const monthlyCategoryTotals = computed(() => {
    return monthlyExpenses.value.reduce((acc, transaction) => {
      if (!acc[transaction.category]) {
        acc[transaction.category] = 0;
      }
      acc[transaction.category] += Math.abs(transaction.amount);
      return acc;
    }, {} as Record<Category, number>);
  });

  // Detect anomalies (unusual spending)
  const detectAnomalies = (): Transaction[] => {
    const expensesByCategory = expenses.value.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(Math.abs(t.amount));
      return acc;
    }, {} as Record<Category, number[]>);

    const anomalies: Transaction[] = [];

    for (const transaction of expenses.value) {
      const categoryAmounts = expensesByCategory[transaction.category] || [];
      if (categoryAmounts.length < 3) continue; // Need at least 3 transactions

      const amounts = categoryAmounts.filter(
        (a) => a !== Math.abs(transaction.amount)
      );
      const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      const stdDev = Math.sqrt(
        amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) /
          amounts.length
      );

      // Flag if transaction is more than 2 standard deviations from mean
      if (Math.abs(transaction.amount) > avg + 2 * stdDev) {
        anomalies.push({ ...transaction, isAnomaly: true });
      }
    }

    return anomalies;
  };

  // Detect recurring payments
  const detectRecurringPayments = (): RecurringPayment[] => {
    const merchantGroups = expenses.value.reduce((acc, t) => {
      const merchant = t.merchant ?? t.description.split(' ')[0] ?? '';
      if (!acc[merchant]) acc[merchant] = [];
      acc[merchant].push(t);
      return acc;
    }, {} as Record<string, Transaction[]>);

    const recurring: RecurringPayment[] = [];

    for (const [merchant, txns] of Object.entries(merchantGroups)) {
      if (txns.length < 2) continue;

      // Sort by date
      const sorted = txns.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate intervals between transactions
      const intervals: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        const daysDiff =
          (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) /
          (1000 * 60 * 60 * 24);
        intervals.push(daysDiff);
      }

      // Check if intervals are consistent (within 20% variance)
      const avgInterval =
        intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
      const isConsistent = intervals.every(
        (i) => Math.abs(i - avgInterval) / avgInterval < 0.2
      );

      // Check if amounts are consistent (within 20% variance)
      const avgAmount =
        txns.reduce((sum, t) => sum + Math.abs(t.amount), 0) / txns.length;
      const isAmountConsistent = txns.every(
        (t) => Math.abs(Math.abs(t.amount) - avgAmount) / avgAmount < 0.2
      );

      if (isConsistent && isAmountConsistent && avgInterval > 0) {
        let frequency: 'weekly' | 'monthly' | 'yearly';
        if (avgInterval <= 10) frequency = 'weekly';
        else if (avgInterval <= 45) frequency = 'monthly';
        else frequency = 'yearly';

        const lastTxn = sorted[sorted.length - 1];

        recurring.push({
          merchant,
          amount: avgAmount,
          category: lastTxn.category,
          frequency,
          lastDate: lastTxn.date,
          nextExpectedDate: new Date(
            lastTxn.date.getTime() + avgInterval * 24 * 60 * 60 * 1000
          ),
          confidence: Math.min(txns.length / 5, 1), // Max confidence at 5+ occurrences
          count: txns.length,
        });
      }
    }

    return recurring.sort((a, b) => b.amount - a.amount);
  };

  // Generate insights
  const generateInsights = (): Insight[] => {
    const insights: Insight[] = [];
    const anomalies = detectAnomalies();
    const recurring = detectRecurringPayments();

    // Anomaly insights
    for (const anomaly of anomalies.slice(0, 3)) {
      insights.push({
        type: 'anomaly',
        message: `Unusual ${anomaly.category} expense: $${Math.abs(
          anomaly.amount
        ).toFixed(2)} at ${anomaly.description}`,
        category: anomaly.category,
        severity: 'warning',
        timestamp: new Date(),
      });
    }

    // Recurring payment insights
    for (const payment of recurring.slice(0, 2)) {
      insights.push({
        type: 'recurring',
        message: `${payment.merchant} - $${payment.amount.toFixed(2)} ${
          payment.frequency
        } subscription detected`,
        category: payment.category,
        severity: 'info',
        timestamp: new Date(),
      });
    }

    // Top spending category
    if (categoryStats.value.length > 0) {
      const top = categoryStats.value[0];
      insights.push({
        type: 'trend',
        message: `${
          top.category.charAt(0).toUpperCase() + top.category.slice(1)
        } is your top expense at $${top.total.toFixed(
          2
        )} (${top.percentage.toFixed(1)}%)`,
        category: top.category,
        severity: 'info',
        timestamp: new Date(),
      });
    }

    return insights;
  };

  return {
    transactions: sortedTransactions,
    expenses,
    income,
    monthlyTransactions,
    monthlyExpenses,
    monthlyIncome,
    monthlyCategoryTotals,
    categoryStats,
    addTransaction,
    addTransactions,
    updateTransactionCategory,
    deleteTransaction,
    clearAllTransactions,
    categorizeTransaction,
    detectAnomalies,
    detectRecurringPayments,
    generateInsights,
  };
};
