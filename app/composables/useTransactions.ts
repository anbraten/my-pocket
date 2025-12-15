import { useLocalStorage } from '@vueuse/core';
import { endOfMonth, startOfMonth } from 'date-fns';
import type {
  Transaction,
  Category,
  CategoryStats,
  Insight,
  RecurringPayment,
} from '~/types';
import {
  categorizeTransaction,
  normalizeDescription,
  type LearnedMapping,
} from '~/utils/categories';
import { getSimilarity } from '~/utils/stringUtils';
import {
  generateRecurringInsights,
  generateCategoryInsights,
} from '~/utils/insights';

export const useTransactions = () => {
  const transactions = useLocalStorage<Transaction[]>(
    'my-pocket:transactions',
    [],
    {
      serializer: {
        read: (v) => {
          if (!v) return [];
          const parsed = JSON.parse(v) as Transaction[];
          // Convert date strings back to Date objects
          return parsed.map((t) => ({
            ...t,
            date: new Date(t.date),
          }));
        },
        write: (v) => JSON.stringify(v),
      },
    }
  );

  // Learned category mappings from user corrections
  const learnedMappings = useLocalStorage<LearnedMapping[]>(
    'my-pocket:learned-mappings',
    [],
    {
      serializer: {
        read: (v) => {
          if (!v) return [];
          const parsed = JSON.parse(v) as LearnedMapping[];
          return parsed.map((m) => ({
            ...m,
            lastUpdated: new Date(m.lastUpdated),
          }));
        },
        write: (v) => JSON.stringify(v),
      },
    }
  );

  // Learn from a manual category correction
  const learnMapping = (description: string, category: Category) => {
    const normalized = normalizeDescription(description);
    const existing = learnedMappings.value.find(
      (m) => m.description === normalized
    );

    if (existing) {
      existing.category = category;
      existing.count++;
      existing.lastUpdated = new Date();
    } else {
      learnedMappings.value.push({
        description: normalized,
        category,
        count: 1,
        lastUpdated: new Date(),
      });
    }
  };

  // Export learned mappings (for sharing with other users later)
  const exportLearnedMappings = (): LearnedMapping[] => {
    return learnedMappings.value
      .filter((m) => m.count >= 2) // Only export if used at least twice
      .map((m) => ({ ...m }));
  };

  // Import learned mappings (merge with existing)
  const importLearnedMappings = (imported: LearnedMapping[]) => {
    imported.forEach((imp) => {
      const existing = learnedMappings.value.find(
        (m) => m.description === imp.description
      );
      if (!existing) {
        learnedMappings.value.push({ ...imp, lastUpdated: new Date() });
      } else if (imp.count > existing.count) {
        // Only override if imported has more confidence
        existing.category = imp.category;
        existing.count = imp.count;
        existing.lastUpdated = new Date();
      }
    });
  };

  // Auto-categorize transaction using learned mappings
  const autoCategorize = (description: string): Category => {
    return categorizeTransaction(description, learnedMappings.value);
  };

  // Add transaction
  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    transactions.value.push(newTransaction);

    // Refresh recurring patterns after adding transaction
    refreshRecurringPatterns();
  };

  // Add multiple transactions (for CSV import)
  const addTransactions = (newTransactions: Omit<Transaction, 'id'>[]) => {
    const withIds = newTransactions.map((t) => ({
      ...t,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }));
    transactions.value.push(...withIds);

    // Refresh recurring patterns after bulk import
    refreshRecurringPatterns();
  };

  // Update transaction category (for learning)
  const updateTransactionCategory = (
    id: string,
    category: Category,
    shouldLearn = true
  ) => {
    const transaction = transactions.value.find((t) => t.id === id);
    if (!transaction) return;

    // Learn from manual correction
    if (shouldLearn && transaction.category !== category) {
      learnMapping(transaction.description, category);
    }

    transactions.value = transactions.value.map((t) =>
      t.id === id ? { ...t, category } : t
    );
  };

  // Delete transaction
  const deleteTransaction = (id: string) => {
    transactions.value = transactions.value.filter((t) => t.id !== id);
  };

  // Clear all transactions
  const clearAllTransactions = () => {
    transactions.value = [];
  };

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

  // Cached recurring payments for performance
  const cachedRecurring = useLocalStorage<RecurringPayment[]>(
    'my-pocket:recurring-payments',
    [],
    {
      serializer: {
        read: (v) => {
          if (!v) return [];
          const parsed = JSON.parse(v) as RecurringPayment[];
          // Convert date strings back to Date objects
          return parsed.map((rp) => ({
            ...rp,
            lastDate: new Date(rp.lastDate),
            nextExpectedDate: rp.nextExpectedDate
              ? new Date(rp.nextExpectedDate)
              : undefined,
          }));
        },
        write: (v) => JSON.stringify(v),
      },
    }
  );

  // Detect recurring payments (both expenses and income)
  const detectRecurringPayments = (
    forceRefresh = false
  ): RecurringPayment[] => {
    if (!forceRefresh && cachedRecurring.value.length > 0) {
      return cachedRecurring.value;
    }

    const recurring: RecurringPayment[] = [];

    // Group by merchant/description with fuzzy matching
    const merchantGroups: Record<string, Transaction[]> = {};

    for (const t of transactions.value) {
      const merchant = t.merchant ?? t.description.split(' ')[0] ?? '';
      const normalizedMerchant = merchant.toLowerCase().trim();

      // Try to find similar existing merchant (fuzzy matching)
      let matchedMerchant = normalizedMerchant;
      for (const existingMerchant of Object.keys(merchantGroups)) {
        const similarity = getSimilarity(normalizedMerchant, existingMerchant);
        // If similarity is above 80%, consider them the same merchant
        if (similarity > 0.8) {
          matchedMerchant = existingMerchant;
          break;
        }
      }

      if (!merchantGroups[matchedMerchant]) {
        merchantGroups[matchedMerchant] = [];
      }
      merchantGroups[matchedMerchant]!.push(t);
    }

    // Analyze each merchant group
    for (const [merchant, groupTxns] of Object.entries(merchantGroups)) {
      const firstTxn = groupTxns[0];
      if (!firstTxn) continue;

      // Sort by date
      const sorted = groupTxns.sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );

      // Calculate intervals between transactions (in days)
      const intervals: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        const curr = sorted[i];
        const prev = sorted[i - 1];
        if (!curr || !prev) continue;
        const daysDiff =
          (curr.date.getTime() - prev.date.getTime()) / (1000 * 60 * 60 * 24);
        intervals.push(daysDiff);
      }

      if (intervals.length === 0) continue;

      const avgInterval =
        intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

      // Calculate coefficient of variation for intervals
      const intervalStdDev = Math.sqrt(
        intervals.reduce((s, i) => s + Math.pow(i - avgInterval, 2), 0) /
          intervals.length
      );
      const intervalCV = intervalStdDev / avgInterval;

      // Check amount consistency
      const amounts = sorted.map((t) => t.amount);
      const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      const amountStdDev = Math.sqrt(
        amounts.reduce((s, a) => s + Math.pow(a - avgAmount, 2), 0) /
          amounts.length
      );
      const amountCV = amountStdDev / Math.abs(avgAmount);

      // Determine if it's recurring based on consistency thresholds
      // More lenient thresholds: allow up to 40% variation in intervals, 30% in amounts
      const isIntervalConsistent = intervalCV < 0.4;
      const isAmountConsistent = amountCV < 0.3;

      if (!isIntervalConsistent || !isAmountConsistent) continue;

      // Determine frequency based on average interval
      let frequency: 'weekly' | 'monthly' | 'yearly' | 'daily' | 'one-time';
      if (avgInterval <= 2) frequency = 'daily';
      else if (avgInterval <= 10) frequency = 'weekly';
      else if (avgInterval <= 45) frequency = 'monthly';
      else frequency = 'yearly';

      const lastTxn = sorted[sorted.length - 1];
      if (!lastTxn) continue;

      // Use the most recent merchant name
      const displayMerchant = lastTxn.merchant ?? merchant;

      // Calculate confidence score (0-1)
      // Based on: count (40%), interval consistency (40%), amount consistency (20%)
      const countScore = Math.min(sorted.length / 12, 1); // Max at 12 occurrences
      const intervalScore = Math.max(0, 1 - intervalCV); // Lower CV = higher score
      const amountScore = Math.max(0, 1 - amountCV); // Lower CV = higher score

      const confidence =
        countScore * 0.4 + intervalScore * 0.4 + amountScore * 0.2;

      // Only include if confidence is above 0.5 (50%)
      if (confidence < 0.5) continue;

      recurring.push({
        merchant: displayMerchant,
        amount: avgAmount,
        category: lastTxn.category,
        frequency,
        lastDate: lastTxn.date,
        nextExpectedDate: new Date(
          lastTxn.date.getTime() + avgInterval * 24 * 60 * 60 * 1000
        ),
        intervals,
        count: sorted.length,
        confidence: Math.min(0.99, confidence), // Cap at 99%
        amountStdDev,
      });
    }

    // Sort by absolute amount (largest first)
    const sortedRecurring = recurring.sort(
      (a, b) => Math.abs(b.amount) - Math.abs(a.amount)
    );

    // Cache the results in memory and localStorage
    cachedRecurring.value = sortedRecurring;

    return sortedRecurring;
  };

  // Trigger recurring detection when transactions change
  const refreshRecurringPatterns = () => {
    detectRecurringPayments(true);
  };

  // Generate insights (using utility functions)
  const generateInsights = (): Insight[] => {
    const recurring = detectRecurringPayments();
    const recurringInsights = generateRecurringInsights(recurring);
    const categoryInsights = generateCategoryInsights(categoryStats.value);

    // Convert InsightMessages to legacy Insight format
    const allMessages = [...recurringInsights, ...categoryInsights];
    return allMessages.map((msg) => ({
      type: msg.type as 'anomaly' | 'trend' | 'recurring' | 'achievement',
      message: msg.description,
      category: msg.category,
      severity:
        msg.severity === 'danger'
          ? 'warning'
          : (msg.severity as 'info' | 'warning' | 'success'),
      timestamp: new Date(),
    }));
  };

  return {
    transactions,
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
    categorizeTransaction: autoCategorize,
    detectRecurringPayments,
    refreshRecurringPatterns,
    generateInsights,
    learnedMappings,
    exportLearnedMappings,
    importLearnedMappings,
  };
};
