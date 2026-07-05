import Dexie, { type EntityTable } from 'dexie';
import type { Transaction, RecurringPayment, Account } from '~/types';

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
  accounts!: EntityTable<Account, 'id'>;

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

export const db = new MyPocketDB();
