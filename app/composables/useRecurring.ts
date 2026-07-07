import { liveQuery } from 'dexie';
import type { RecurringPayment } from '~/types';
import { db } from '~/utils/db';
import { migrateLegacyData } from '~/utils/db/migrateLegacyData';

const recurringPayments = ref<RecurringPayment[]>([]);
const isComputingRecurring = ref(false);

let recurringInitPromise: Promise<void> | null = null;
let recurringWorker: Worker | null = null;
let pendingRecurringRerun = false;
let recurringDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function getRecurringWorker(): Worker {
  if (!recurringWorker) {
    recurringWorker = new Worker(
      new URL('../workers/recurring.worker.ts', import.meta.url),
      { type: 'module' },
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
  // Worker reads transactions from its own DB instance.
  getRecurringWorker().postMessage({ type: 'detect' });
}

// Named export so useTransactions can call it after mutations without
// creating a circular dependency.
export function scheduleRecurringDetection() {
  if (!import.meta.client) return;
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

// Called by useTransactions.ensureLoaded so migration runs before the
// liveQuery is set up. Safe to call multiple times — guarded by initPromise.
export function ensureRecurringLoaded(): Promise<void> {
  if (!import.meta.client) return Promise.resolve();
  if (!recurringInitPromise) {
    recurringInitPromise = (async () => {
      await migrateLegacyData();

      liveQuery(() => db.recurringPayments.toArray()).subscribe({
        next: (rows) => {
          recurringPayments.value = rows.map(
            ({ cacheKey: _ck, ...rest }) => rest as RecurringPayment,
          );
        },
        error: (err) => console.error('[recurring liveQuery]', err),
      });

      scheduleRecurringDetection();
    })();
  }
  return recurringInitPromise;
}

export function useRecurring() {
  ensureRecurringLoaded();

  async function clearRecurringData() {
    await db.recurringPayments.clear();
    await db.recurringCacheMeta.clear();
  }

  return {
    recurringPayments,
    isComputingRecurring,
    refreshRecurringPatterns: scheduleRecurringDetection,
    clearRecurringData,
  };
}
