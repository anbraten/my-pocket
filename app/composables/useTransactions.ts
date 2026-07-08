import { endOfMonth, startOfMonth } from 'date-fns';
import type { Transaction } from '~/types';
import { type Category } from '~/utils/categories';
import { db } from '~/utils/db';
import { useRecurring } from './useRecurring';

const CHUNK_SIZE = 500;

// Incremented on add/delete so composables watching it re-query the DB.
const transactionVersion = ref(0);

function bumpVersion() {
  transactionVersion.value++;
}

export function useTransactions() {
  const categoryDetection = useCategoryDetection();
  const { runRecurringDetection } = useRecurring();

  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  async function addTransaction(transaction: Omit<Transaction, 'id'>) {
    const newTransaction: Transaction = { ...transaction, id: generateId() };
    await db.transactions.add(newTransaction);
    bumpVersion();
    runRecurringDetection();
  }

  async function addTransactions(newTransactions: Omit<Transaction, 'id'>[]) {
    if (newTransactions.length === 0) return { added: 0, tagged: 0 };

    // Query only the date range of the incoming batch for dedup —
    // avoids holding the full history in memory.
    const timestamps = newTransactions.map((t) => t.date.getTime());
    const minDate = new Date(Math.min(...timestamps));
    const maxDate = new Date(Math.max(...timestamps));

    const existingInRange = await db.transactions
      .where('date')
      .between(minDate, maxDate, true, true)
      .toArray();

    const signatureMap = new Map(
      existingInRange.map((t) => [
        `${t.date.toISOString()}|${t.amount}|${t.description}`,
        t,
      ]),
    );

    const toAdd: Omit<Transaction, 'id'>[] = [];
    let tagged = 0;

    // TODO: use some database query / index directly to find duplicates instead of loading all into memory.
    for (const t of newTransactions) {
      const sig = `${t.date.toISOString()}|${t.amount}|${t.description}`;
      const match = signatureMap.get(sig);
      if (match) {
        if (t.accountId && !match.accountId) {
          await db.transactions.update(match.id, { accountId: t.accountId });
          tagged++;
        }
      } else {
        toAdd.push(t);
      }
    }

    if (toAdd.length > 0) {
      const withIds: Transaction[] = toAdd.map((t) => ({
        ...t,
        id: generateId(),
      }));

      for (let i = 0; i < withIds.length; i += CHUNK_SIZE) {
        const chunk = withIds.slice(i, i + CHUNK_SIZE);
        await db.transactions.bulkAdd(chunk);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      await detectTransfers(withIds);

      const trainingSamples = await db.transactions
        .where('category')
        .notEqual('other')
        .toArray();
      if (trainingSamples.length > 0) {
        categoryDetection.train(trainingSamples);
      }

      bumpVersion();
      runRecurringDetection();
    }

    return { added: toAdd.length, tagged };
  }

  const TRANSFER_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

  async function detectTransfers(newTxs: Transaction[]) {
    for (const newTx of newTxs) {
      if (!newTx.accountId || newTx.isTransfer) continue;

      const windowStart = new Date(newTx.date.getTime() - TRANSFER_WINDOW_MS);
      const windowEnd = new Date(newTx.date.getTime() + TRANSFER_WINDOW_MS);

      const candidates = await db.transactions
        .where('date')
        .between(windowStart, windowEnd, true, true)
        .toArray();

      const counterpart = candidates.find(
        (t) =>
          t.id !== newTx.id &&
          t.accountId &&
          t.accountId !== newTx.accountId &&
          !t.isTransfer &&
          Math.abs(t.amount + newTx.amount) < 0.01 &&
          Math.abs(t.date.getTime() - newTx.date.getTime()) <=
            TRANSFER_WINDOW_MS,
      );

      if (counterpart) {
        newTx.isTransfer = true;
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
    shouldLearn = true,
  ) {
    const current = await db.transactions.get(id);
    if (!current) return;

    if (shouldLearn && current.category !== category && category !== 'other') {
      categoryDetection.trainSample({ ...current, category });
    }

    await db.transactions.update(id, { category });
    // No bumpVersion — callers apply optimistic local updates in the UI.
  }

  async function bulkRecategorize(): Promise<number> {
    const labeled = await db.transactions
      .where('category')
      .notEqual('other')
      .toArray();
    if (labeled.length > 0) {
      categoryDetection.train(labeled);
    }

    const uncategorized = await db.transactions
      .where('category')
      .equals('other')
      .toArray();
    let updated = 0;

    for (const t of uncategorized) {
      const newCategory = categoryDetection.predict(t);
      if (newCategory !== 'other') {
        await db.transactions.update(t.id, { category: newCategory });
        updated++;
      }
    }

    if (updated > 0) bumpVersion();
    return updated;
  }

  async function deleteTransaction(id: string) {
    await db.transactions.delete(id);
    bumpVersion();
    runRecurringDetection();
  }

  async function deleteTransactionsByAccount(accountId: string) {
    await db.transactions.where('accountId').equals(accountId).delete();
    bumpVersion();
    runRecurringDetection();
  }

  async function clearAllTransactions() {
    await db.transactions.clear();
    bumpVersion();
  }

  async function getOldestTransactionDate(): Promise<Date | null> {
    if (!import.meta.client) return null;
    const oldest = await db.transactions.orderBy('date').first();
    return oldest?.date ?? null;
  }

  async function searchTransactions(query: string): Promise<Transaction[]> {
    if (!import.meta.client || !query.trim()) return [];
    const lower = query.toLowerCase();
    return db.transactions
      .filter((t) => t.description.toLowerCase().includes(lower))
      .toArray();
  }

  return {
    transactionVersion,
    addTransaction,
    addTransactions,
    updateTransactionCategory,
    bulkRecategorize,
    deleteTransaction,
    deleteTransactionsByAccount,
    clearAllTransactions,
    getOldestTransactionDate,
    searchTransactions,
  };
}

export function useTransactionsByMonth(month: Ref<Date>) {
  const monthTransactions = ref<Transaction[]>([]);
  const isLoading = ref(true);

  const load = async () => {
    if (!import.meta.client) return;
    isLoading.value = true;
    const start = startOfMonth(month.value);
    const end = endOfMonth(month.value);
    monthTransactions.value = await db.transactions
      .where('date')
      .between(start, end, true, true)
      .toArray();
    isLoading.value = false;
  };

  // Re-query when the month changes or when transactions are added/deleted.
  watch([month, transactionVersion], load, { immediate: true });

  return { monthTransactions, isLoading, refresh: load };
}
