import Dexie, { type EntityTable } from 'dexie';
import { detectRecurringPayments } from '~/utils/detectRecurring';
import { RecurringModel, type Model } from '~/composables/recurring/model';
import type { Transaction, RecurringPayment, RecurringFeedback } from '~/types';

const RECURRING_CACHE_VERSION = 10;

interface RecurringCacheRow extends RecurringPayment {
  cacheKey: string;
}

interface RecurringCacheMeta {
  id: string;
  txCount: number;
  lastTxId: string | null;
  cacheVersion?: number;
}

interface RecurringModelRow extends Model {
  id: string;
}

// Worker-local Dexie instance — shares the same IndexedDB as the main thread.
class WorkerDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  recurringPayments!: EntityTable<RecurringCacheRow, 'cacheKey'>;
  recurringCacheMeta!: EntityTable<RecurringCacheMeta, 'id'>;
  recurringFeedback!: EntityTable<RecurringFeedback, 'id'>;
  recurringModel!: EntityTable<RecurringModelRow, 'id'>;

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

    this.version(3).stores({
      recurringFeedback: 'id, paymentId',
      recurringModel: 'id',
    });
  }
}

const db = new WorkerDB();

async function loadModel(): Promise<RecurringModel> {
  const saved = await db.recurringModel.get('default');
  return new RecurringModel(saved ?? undefined);
}

async function detect(force: boolean) {
  const allTransactions = await db.transactions.toArray();
  const transactions = allTransactions.filter((t) => !t.isTransfer);

  const txCount = transactions.length;
  const lastTxId = transactions[txCount - 1]?.id ?? null;

  const meta = await db.recurringCacheMeta.get('default');
  if (
    force !== true &&
    meta?.cacheVersion === RECURRING_CACHE_VERSION &&
    meta.txCount === txCount &&
    meta.lastTxId === lastTxId
  ) {
    self.postMessage({ type: 'done', cached: true });
    return;
  }

  const model = await loadModel();
  const results = detectRecurringPayments(transactions, model);

  const rows: RecurringCacheRow[] = results.map((p) => ({
    ...p,
    cacheKey: p.id,
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

  return { count: rows.length };
}

async function retrain() {
  const allFeedback = await db.recurringFeedback.toArray();
  if (allFeedback.length === 0) return;

  const labeledData = allFeedback.map((f) => ({
    transaction: {
      description: f.description,
      amount: f.amount,
      count: f.count,
      frequency: f.frequency,
      intervals: f.intervals,
      amountStdDev: f.amountStdDev,
      lastDate: f.lastDate,
    },
    isRecurring: f.isRecurring,
  }));

  const saved = await db.recurringModel.get('default');
  const newModel = RecurringModel.train(labeledData, saved ?? undefined);

  await db.recurringModel.put({ id: 'default', ...newModel });
}

self.onmessage = async (event: MessageEvent) => {
  const { type } = event.data as { type: string };

  try {
    switch (type) {
      case 'detect': {
        const force = event.data.force ?? false;
        const result = await detect(force);
        self.postMessage({ type: 'done', result });
        break;
      }
      case 'feedback': {
        const feedback = event.data.feedback as RecurringFeedback;
        await db.recurringFeedback.put(feedback);
        await retrain();
        // Force re-detection with the updated model.
        const result = await detect(true);
        self.postMessage({ type: 'done', result });
        break;
      }
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (e: any) {
    self.postMessage({ type: 'error', error: e?.message });
  }
};
