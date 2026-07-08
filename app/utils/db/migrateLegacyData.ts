import { db } from '~/utils/db';
import type { Transaction, RecurringPayment } from '~/types';
import { fnv1a, extractDescriptionCore } from '~/utils/detectRecurring';

const MIGRATION_FLAG = 'my-pocket:migrated-v1';

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// One-time copy of legacy localStorage data into Dexie. Safe to call on
// every app start - it no-ops once the migration flag is set.
export async function migrateLegacyData() {
  if (localStorage.getItem(MIGRATION_FLAG)) return;

  const legacyTransactions = readJSON<Transaction[]>('my-pocket:transactions');
  if (legacyTransactions?.length) {
    const transactions = legacyTransactions.map((t) => ({
      ...t,
      date: new Date(t.date),
    }));
    await db.transactions.bulkPut(transactions);
  }

  const legacyRecurring = readJSON<RecurringPayment[]>(
    'my-pocket:recurring-payments',
  );
  if (legacyRecurring?.length) {
    const recurring = legacyRecurring.map((r) => {
      const id = fnv1a(extractDescriptionCore(r.description));
      return {
        ...r,
        id,
        lastDate: new Date(r.lastDate),
        nextExpectedDate: r.nextExpectedDate
          ? new Date(r.nextExpectedDate)
          : undefined,
        cacheKey: id,
      };
    });
    await db.recurringPayments.bulkPut(recurring);
  }

  const legacyModel = readJSON<unknown>('my-pocket:category-model');
  if (legacyModel) {
    await db.categoryModel.put({ id: 'default', model: legacyModel });
  }

  localStorage.setItem(MIGRATION_FLAG, '1');
}
