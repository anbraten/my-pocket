import { useLocalStorage } from '@vueuse/core';
import { endOfMonth, startOfMonth } from 'date-fns';
import type {
  Transaction,
  CategoryStats,
  Insight,
  RecurringPayment,
} from '~/types';
import type { Category } from '~/utils/categories';
import { getSimilarity } from '~/utils/stringUtils';
import {
  generateRecurringInsights,
  generateCategoryInsights,
} from '~/utils/insights';
import { useCategoryML } from '~/composables/useCategoryML';
import { RecurringModel } from './recurring/model';

export function useTransactions() {
  const mlCategory = useCategoryML();
  const mlRecurring = new RecurringModel();

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

  // Auto-categorize transaction using ML model
  function autoCategorize(transaction: Transaction): Category {
    // Try ML model - if confident, use it
    const mlPrediction = mlCategory.predict(transaction);
    if (mlPrediction && mlPrediction.confidence > 0.6) {
      return mlPrediction.category as Category;
    } else if (mlPrediction) {
      console.log(
        `ML prediction for "${
          transaction.description
        }" not confident enough (${(mlPrediction.confidence * 100).toFixed(
          0
        )}%)`
      );
    }

    // Not confident? Mark as 'other' for user to review
    return 'other';
  }

  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // Add transaction
  function addTransaction(transaction: Omit<Transaction, 'id'>) {
    const id = generateId();
    const newTransaction: Transaction = {
      ...transaction,
      id,
      isRecurring: mlRecurring.predict({ ...transaction, id }) > 0.5,
    };
    transactions.value.push(newTransaction);
  }

  // Add multiple transactions (for CSV import)
  function addTransactions(newTransactions: Omit<Transaction, 'id'>[]) {
    const existingSignatures = new Set(
      transactions.value.map(
        (t) => `${t.date.toISOString()}|${t.amount}|${t.description}`
      )
    );

    const uniqueNewTransactions = newTransactions.filter((t) => {
      const signature = `${t.date.toISOString()}|${t.amount}|${t.description}`;
      return !existingSignatures.has(signature);
    });

    if (uniqueNewTransactions.length === 0) return 0;

    const withIds = uniqueNewTransactions.map((t) => {
      const id = generateId();

      return {
        ...t,
        id,
        isRecurring: mlRecurring.predict({ ...t, id }) > 0.5,
      };
    });
    transactions.value.push(...withIds);

    // Train ML model ONLY on non-'other' transactions
    const trainingSamples = transactions.value.filter(
      (t) => t.category !== 'other'
    );

    if (trainingSamples.length > 0) {
      mlCategory.train(trainingSamples);
    }

    return uniqueNewTransactions.length;
  }

  // Update transaction category (trains ML model automatically)
  function updateTransactionCategory(
    id: string,
    category: Category,
    shouldLearn = true
  ) {
    const transaction = transactions.value.find((t) => t.id === id);
    if (!transaction) return;

    // Train ML model on user corrections (skip if setting to 'other')
    if (
      shouldLearn &&
      transaction.category !== category &&
      category !== 'other'
    ) {
      mlCategory.trainSample({ ...transaction, category });
    }

    transactions.value = transactions.value.map((t) =>
      t.id === id ? { ...t, category } : t
    );
  }

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
    // if (!forceRefresh && cachedRecurring.value.length > 0) {
    //   return cachedRecurring.value;
    // }

    const recurring: RecurringPayment[] = [];

    // Group by merchant/description with fuzzy matching
    const merchantGroups: Record<string, Transaction[]> = {};

    for (const t of transactions.value) {
      const merchant = t.description.split('\n')[0] ?? '';
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
      if (groupTxns.length < 2) continue;

      const firstTxn = groupTxns[0];
      if (!firstTxn) continue;

      // Sort by date
      const sortedTransactions = groupTxns.sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );

      // Calculate intervals between transactions (in days)
      const intervals: number[] = [];
      for (let i = 1; i < sortedTransactions.length; i++) {
        const curr = sortedTransactions[i];
        const prev = sortedTransactions[i - 1];
        if (!curr || !prev) continue;
        const daysDiff =
          (curr.date.getTime() - prev.date.getTime()) / (1000 * 60 * 60 * 24);
        intervals.push(daysDiff);
      }

      const avgInterval =
        intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

      // Check amount consistency
      const amounts = sortedTransactions.map((t) => t.amount);
      const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      const amountStdDev = Math.sqrt(
        amounts.reduce((s, a) => s + Math.pow(a - avgAmount, 2), 0) /
          amounts.length
      );

      // Determine frequency based on average interval
      let frequency: 'weekly' | 'monthly' | 'yearly' | 'daily' | 'one-time';
      if (avgInterval <= 2) frequency = 'daily';
      else if (avgInterval <= 10) frequency = 'weekly';
      else if (avgInterval <= 45) frequency = 'monthly';
      else frequency = 'yearly';

      const lastTxn = sortedTransactions[sortedTransactions.length - 1];
      if (!lastTxn) continue;

      // Use the most recent merchant name
      const displayMerchant = lastTxn.description.split('\n')[0] ?? merchant;

      const confidence = mlRecurring.predict({
        amount: avgAmount,
        frequency,
        intervals,
        count: sortedTransactions.length,
        merchant: displayMerchant,
        amountStdDev,
        lastDate: lastTxn.date.toISOString(),
      });

      if (confidence < 0.3) continue;

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
        count: sortedTransactions.length,
        confidence: Math.min(1.0, confidence), // Cap at 100%
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
  };
}
