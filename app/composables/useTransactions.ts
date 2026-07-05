import { endOfMonth, startOfMonth } from 'date-fns';
import { liveQuery } from 'dexie';
import type {
  Transaction,
  CategoryStats,
  Insight,
  RecurringPayment,
} from '~/types';
import { type Category, categorizeTransaction } from '~/utils/categories';
import {
  generateRecurringInsights,
  generateCategoryInsights,
} from '~/utils/insights';
import { useCategoryML } from '~/composables/useCategoryML';
import { db } from '~/utils/db';
import { migrateLegacyData } from '~/utils/db/migrateLegacyData';

const CHUNK_SIZE = 500;

// Module-level singleton state, shared across every useTransactions() call.
const transactions = ref<Transaction[]>([]);
const isLoaded = ref(false);
const recurringPayments = ref<RecurringPayment[]>([]);
const isComputingRecurring = ref(false);

let initPromise: Promise<void> | null = null;
let recurringWorker: Worker | null = null;
let pendingRecurringRerun = false;
let recurringDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function getRecurringWorker(): Worker {
  if (!recurringWorker) {
    recurringWorker = new Worker(
      new URL('../workers/recurring.worker.ts', import.meta.url),
      { type: 'module' }
    );
    recurringWorker.onmessage = () => {
      isComputingRecurring.value = false;
      if (pendingRecurringRerun) {
        pendingRecurringRerun = false;
        runRecurringWorker();
      }
    };
    recurringWorker.onerror = () => {
      isComputingRecurring.value = false;
    };
  }
  return recurringWorker;
}

function runRecurringWorker() {
  isComputingRecurring.value = true;
  // Exclude transfers — they're internal movements, not real recurring payments.
  const plainTransactions = transactions.value
    .filter((t) => !t.isTransfer)
    .map((t) => ({ ...t }));
  getRecurringWorker().postMessage({ type: 'detect', transactions: plainTransactions });
}

// Debounced so rapid mutations (bulk category updates, deletes) coalesce.
function scheduleRecurringDetection() {
  if (!import.meta.client || transactions.value.length === 0) return;
  if (recurringDebounceTimer) clearTimeout(recurringDebounceTimer);
  recurringDebounceTimer = setTimeout(() => {
    recurringDebounceTimer = null;
    if (isComputingRecurring.value) {
      pendingRecurringRerun = true;
      return;
    }
    runRecurringWorker();
  }, 300);
}

function ensureLoaded() {
  if (!import.meta.client) return Promise.resolve();
  if (!initPromise) {
    initPromise = (async () => {
      await migrateLegacyData();
      transactions.value = await db.transactions.toArray();

      // Live query: whenever the worker (or any write) updates recurringPayments
      // in IndexedDB, Vue sees the change automatically.
      liveQuery(() => db.recurringPayments.toArray()).subscribe({
        next: (rows) => {
          recurringPayments.value = rows.map(({ cacheKey: _ck, ...rest }) => rest as RecurringPayment);
        },
        error: (err) => console.error('[recurring liveQuery]', err),
      });

      isLoaded.value = true;

      // Run initial detection in the worker. The worker skips if the cache
      // is already fresh.
      scheduleRecurringDetection();
    })();
  }
  return initPromise;
}

export function useTransactions() {
  ensureLoaded();

  const mlCategory = useCategoryML();

  function autoCategorize(transaction: Transaction): Category {
    const mlPrediction = mlCategory.predict(transaction);
    if (mlPrediction && mlPrediction.confidence > 0.6) {
      return mlPrediction.category as Category;
    }
    return categorizeTransaction(transaction.description);
  }

  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  async function addTransaction(transaction: Omit<Transaction, 'id'>) {
    const id = generateId();
    const newTransaction: Transaction = { ...transaction, id };
    transactions.value.push(newTransaction);
    await db.transactions.add(newTransaction);
    scheduleRecurringDetection();
  }

  async function addTransactions(newTransactions: Omit<Transaction, 'id'>[]) {
    const signatureMap = new Map(
      transactions.value.map((t) => [
        `${t.date.toISOString()}|${t.amount}|${t.description}`,
        t,
      ])
    );

    const toAdd: Omit<Transaction, 'id'>[] = [];
    let tagged = 0;

    for (const t of newTransactions) {
      const sig = `${t.date.toISOString()}|${t.amount}|${t.description}`;
      const existing = signatureMap.get(sig);
      if (existing) {
        // If incoming has an accountId and the stored one doesn't, tag it now.
        if (t.accountId && !existing.accountId) {
          existing.accountId = t.accountId;
          await db.transactions.update(existing.id, { accountId: t.accountId });
          tagged++;
        }
      } else {
        toAdd.push(t);
      }
    }

    if (toAdd.length > 0) {
      const withIds: Transaction[] = toAdd.map((t) => ({ ...t, id: generateId() }));

      for (let i = 0; i < withIds.length; i += CHUNK_SIZE) {
        const chunk = withIds.slice(i, i + CHUNK_SIZE);
        transactions.value.push(...chunk);
        await db.transactions.bulkAdd(chunk);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      await detectTransfers(withIds);

      const trainingSamples = transactions.value.filter((t) => t.category !== 'other');
      if (trainingSamples.length > 0) {
        mlCategory.train(trainingSamples);
      }

      scheduleRecurringDetection();
    }

    return { added: toAdd.length, tagged };
  }

  const TRANSFER_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

  async function detectTransfers(newTxs: Transaction[]) {
    for (const newTx of newTxs) {
      if (!newTx.accountId || newTx.isTransfer) continue;

      const counterpart = transactions.value.find(
        (t) =>
          t.id !== newTx.id &&
          t.accountId &&
          t.accountId !== newTx.accountId &&
          !t.isTransfer &&
          Math.abs(t.amount + newTx.amount) < 0.01 && // opposite sign, same absolute amount
          Math.abs(t.date.getTime() - newTx.date.getTime()) <= TRANSFER_WINDOW_MS
      );

      if (counterpart) {
        newTx.isTransfer = true;
        counterpart.isTransfer = true;
        await db.transactions.bulkUpdate([
          { key: newTx.id, changes: { isTransfer: true } },
          { key: counterpart.id, changes: { isTransfer: true } },
        ]);
      }
    }
  }

  async function updateTransactionCategory(
    id: string,
    category: Category,
    shouldLearn = true
  ) {
    const transaction = transactions.value.find((t) => t.id === id);
    if (!transaction) return;

    if (shouldLearn && transaction.category !== category && category !== 'other') {
      mlCategory.trainSample({ ...transaction, category });
    }

    transaction.category = category;
    await db.transactions.update(id, { category });
    scheduleRecurringDetection();
  }

  async function bulkRecategorize(): Promise<number> {
    const labeled = transactions.value.filter((t) => t.category !== 'other');
    if (labeled.length > 0) {
      mlCategory.train(labeled);
    }

    const uncategorized = transactions.value.filter(
      (t) => t.category === 'other'
    );
    let updated = 0;

    for (const t of uncategorized) {
      const newCategory = autoCategorize(t);
      if (newCategory !== 'other') {
        t.category = newCategory;
        await db.transactions.update(t.id, { category: newCategory });
        updated++;
      }
    }

    return updated;
  }

  async function deleteTransaction(id: string) {
    const index = transactions.value.findIndex((t) => t.id === id);
    if (index !== -1) transactions.value.splice(index, 1);
    await db.transactions.delete(id);
    scheduleRecurringDetection();
  }

  async function deleteTransactionsByAccount(accountId: string) {
    transactions.value = transactions.value.filter((t) => t.accountId !== accountId);
    await db.transactions.where('accountId').equals(accountId).delete();
    scheduleRecurringDetection();
  }

  async function clearAllTransactions() {
    transactions.value = [];
    recurringPayments.value = [];
    await db.transactions.clear();
    await db.recurringPayments.clear();
    await db.recurringCacheMeta.clear();
  }

  async function getOldestTransactionDate(): Promise<Date | null> {
    if (!import.meta.client) return null;
    await ensureLoaded();
    const oldest = await db.transactions.orderBy('date').first();
    return oldest?.date ?? null;
  }

  const expenses = computed(() => transactions.value.filter((t) => t.amount < 0 && !t.isTransfer));
  const income = computed(() => transactions.value.filter((t) => t.amount > 0 && !t.isTransfer));

  const categoryStats = computed((): CategoryStats[] => {
    const expenseTransactions = expenses.value;
    const total = Math.abs(
      expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
    );

    const statsByCategory = expenseTransactions.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = { total: 0, count: 0 };
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
    return { start: startOfMonth(now), end: endOfMonth(now) };
  });

  const monthlyTransactions = computed(() => {
    const { start, end } = currentMonthRange.value;
    return transactions.value.filter((t) => t.date >= start && t.date <= end);
  });

  const monthlyExpenses = computed(() =>
    monthlyTransactions.value.filter((t) => t.amount < 0 && !t.isTransfer)
  );

  const monthlyIncome = computed(() =>
    monthlyTransactions.value.filter((t) => t.amount > 0 && !t.isTransfer)
  );

  const monthlyCategoryTotals = computed(() => {
    return monthlyExpenses.value.reduce((acc, transaction) => {
      if (!acc[transaction.category]) acc[transaction.category] = 0;
      acc[transaction.category] += Math.abs(transaction.amount);
      return acc;
    }, {} as Record<Category, number>);
  });

  // Thin wrapper kept for backward compat — callers that wrap this in
  // computed() will track the reactive recurringPayments ref automatically.
  const detectRecurringPayments = () => recurringPayments.value;

  // Force a fresh worker run (e.g. called from UI refresh buttons).
  const refreshRecurringPatterns = () => scheduleRecurringDetection();

  const generateInsights = (): Insight[] => {
    const recurringInsights = generateRecurringInsights(recurringPayments.value);
    const categoryInsights = generateCategoryInsights(categoryStats.value);

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
    isLoaded,
    recurringPayments,
    isComputingRecurring,
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
    bulkRecategorize,
    deleteTransaction,
    deleteTransactionsByAccount,
    clearAllTransactions,
    getOldestTransactionDate,
    categorizeTransaction: autoCategorize,
    detectRecurringPayments,
    refreshRecurringPatterns,
    generateInsights,
  };
}

export function useTransactionsByMonth(month: Ref<Date>) {
  const monthTransactions = ref<Transaction[]>([]);
  const isLoading = ref(true);

  const load = async () => {
    if (!import.meta.client) return;
    await ensureLoaded();
    isLoading.value = true;
    const start = startOfMonth(month.value);
    const end = endOfMonth(month.value);
    monthTransactions.value = await db.transactions
      .where('date')
      .between(start, end, true, true)
      .toArray();
    isLoading.value = false;
  };

  watch(month, load, { immediate: true });

  return { monthTransactions, isLoading, refresh: load };
}
