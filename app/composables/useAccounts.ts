import { db } from '~/utils/db';
import type { Account, AccountType } from '~/types';
import { useTransactions } from '~/composables/useTransactions';

export const ACCOUNT_COLORS = [
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#f43f5e', // rose
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  investment: 'Investment',
};

const accounts = ref<Account[]>([]);
let initPromise: Promise<void> | null = null;

function ensureLoaded() {
  if (!import.meta.client) return Promise.resolve();
  if (!initPromise) {
    initPromise = db.accounts.toArray().then((rows) => {
      accounts.value = rows;
    });
  }
  return initPromise;
}

export function useAccounts() {
  ensureLoaded();

  function generateId() {
    return `acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  async function addAccount(account: Omit<Account, 'id'>): Promise<Account> {
    const newAccount: Account = { ...account, id: generateId() };
    await db.accounts.add(newAccount);
    accounts.value.push(newAccount);
    return newAccount;
  }

  async function updateAccount(
    id: string,
    changes: Partial<Omit<Account, 'id'>>,
  ) {
    await db.accounts.update(id, changes);
    const idx = accounts.value.findIndex((a) => a.id === id);
    const existing = accounts.value[idx];
    if (existing) Object.assign(existing, changes);
  }

  async function deleteAccount(id: string) {
    const { deleteTransactionsByAccount } = useTransactions();
    await deleteTransactionsByAccount(id);
    await db.accounts.delete(id);
    const idx = accounts.value.findIndex((a) => a.id === id);
    if (idx !== -1) accounts.value.splice(idx, 1);
  }

  function getAccount(id: string | undefined): Account | undefined {
    if (!id) return undefined;
    return accounts.value.find((a) => a.id === id);
  }

  const accountOptions = computed(() => [
    ...accounts.value.map((a) => ({ label: a.name, value: a.id })),
    { label: 'No account', value: '' },
  ]);

  return {
    accounts,
    accountOptions,
    addAccount,
    updateAccount,
    deleteAccount,
    getAccount,
  };
}
