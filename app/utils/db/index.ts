import Dexie, { type EntityTable } from 'dexie';
import type { Transaction, RecurringPayment } from '~/types';

export interface CategoryModelRow {
  id: string;
  model: unknown;
}

export interface RecurringCacheRow extends RecurringPayment {
  cacheKey: string;
}

export interface RecurringCacheMeta {
  id: string;
  txCount: number;
  lastTxId: string | null;
  cacheVersion?: number;
}

class MyPocketDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  recurringPayments!: EntityTable<RecurringCacheRow, 'cacheKey'>;
  recurringCacheMeta!: EntityTable<RecurringCacheMeta, 'id'>;
  categoryModel!: EntityTable<CategoryModelRow, 'id'>;

  constructor() {
    super('my-pocket');

    this.version(1).stores({
      transactions: 'id, date, category',
      recurringPayments: 'cacheKey',
      recurringCacheMeta: 'id',
      categoryModel: 'id',
    });

    // Future schema changes go here, e.g.:
    // this.version(2).stores({ ... }).upgrade((tx) => { ... });
  }
}

export const db = new MyPocketDB();
