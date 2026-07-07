import Dexie, { type EntityTable } from 'dexie';
import { detectRecurringPayments } from '~/utils/detectRecurring';
import type { Transaction, RecurringPayment } from '~/types';

const RECURRING_CACHE_VERSION = 4;

interface RecurringCacheRow extends RecurringPayment {
  cacheKey: string;
}

interface RecurringCacheMeta {
  id: string;
  txCount: number;
  lastTxId: string | null;
  cacheVersion?: number;
}

// Worker-local Dexie instance — shares the same IndexedDB as the main thread.
class WorkerDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  recurringPayments!: EntityTable<RecurringCacheRow, 'cacheKey'>;
  recurringCacheMeta!: EntityTable<RecurringCacheMeta, 'id'>;

  constructor() {
    super('my-pocket');
    this.version(1).stores({
      transactions: 'id, date, category',
      recurringPayments: 'cacheKey',
      recurringCacheMeta: 'id',
      categoryModel: 'id',
    });

    this.version(2).stores({
      transactions: 'id, date, category, accountId',
      accounts: 'id',
    });
  }
}

const db = new WorkerDB();

self.onmessage = async (event: MessageEvent) => {
  const { type } = event.data as { type: string };

  if (type !== 'detect') return;

  try {
    // Read directly from IndexedDB — no serialisation cost from the main thread.
    const allTransactions = await db.transactions.toArray();
    const transactions = allTransactions.filter((t) => !t.isTransfer);

    const txCount = transactions.length;
    const lastTxId = transactions[txCount - 1]?.id ?? null;

    // Skip recompute if the persisted cache is already up to date.
    const meta = await db.recurringCacheMeta.get('default');
    if (
      meta?.cacheVersion === RECURRING_CACHE_VERSION &&
      meta.txCount === txCount &&
      meta.lastTxId === lastTxId
    ) {
      self.postMessage({ type: 'done', cached: true });
      return;
    }

    const results = detectRecurringPayments(transactions);

    const rows: RecurringCacheRow[] = results.map((p) => ({
      ...p,
      cacheKey: `${p.merchant}|${p.amount}`,
    }));

    await db.transaction(
      'rw',
      db.recurringPayments,
      db.recurringCacheMeta,
      async () => {
        await db.recurringPayments.clear();
        if (rows.length > 0) await db.recurringPayments.bulkPut(rows);
        await db.recurringCacheMeta.put({
          id: 'default',
          txCount,
          lastTxId,
          cacheVersion: RECURRING_CACHE_VERSION,
        });
      },
    );

    self.postMessage({ type: 'done', count: results.length });
  } catch (e: any) {
    self.postMessage({ type: 'error', error: e?.message });
  }
};
