import { liveQuery } from 'dexie';
import type { RecurringPayment, RecurringFeedback } from '~/types';
import { db } from '~/utils/db';
import { migrateLegacyData } from '~/utils/db/migrateLegacyData';

const recurringPayments = ref<RecurringPayment[]>([]);
const isComputingRecurring = ref(false);

let recurringWorker: Worker | null = null;

async function getRecurringWorker(): Promise<Worker> {
  if (!recurringWorker) {
    await migrateLegacyData();

    liveQuery(() => db.recurringPayments.toArray()).subscribe({
      next: (rows) => {
        recurringPayments.value = rows.map(
          ({ cacheKey: _ck, ...rest }) => rest as RecurringPayment,
        );
      },
      error: (err) => console.error('[recurring liveQuery]', err),
    });

    recurringWorker = new Worker(
      new URL('../workers/recurring.worker.ts', import.meta.url),
      { type: 'module' },
    );
    recurringWorker.onmessage = ({ data }) => {
      isComputingRecurring.value = false;
      console.log('[recurring worker]', data);
    };
    recurringWorker.onerror = () => {
      isComputingRecurring.value = false;
    };
  }
  return recurringWorker;
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}

const runRecurringDetection = debounce(async (force: boolean = false) => {
  isComputingRecurring.value = true;
  const worker = await getRecurringWorker();
  worker.postMessage({ type: 'detect', force });
}, 300);

export function useRecurring() {
  async function clearRecurringData() {
    await db.recurringPayments.clear();
    await db.recurringCacheMeta.clear();
    await db.recurringFeedback.clear();
    await db.recurringModel.clear();
  }

  async function giveFeedback(payment: RecurringPayment, isRecurring: boolean) {
    const feedback: RecurringFeedback = toRaw({
      id: `${payment.id}`,
      paymentId: payment.id,
      isRecurring,
      description: payment.description,
      amount: payment.amount,
      count: payment.transactionIds.length,
      frequency: payment.frequency,
      intervals: [...(payment.intervals ?? [])],
      amountStdDev: payment.amountStdDev ?? 0,
      lastDate: payment.lastDate.toISOString(),
    });

    isComputingRecurring.value = true;
    const worker = await getRecurringWorker();
    worker.postMessage({ type: 'feedback', feedback });
  }

  return {
    recurringPayments,
    isComputingRecurring,
    runRecurringDetection,
    clearRecurringData,
    giveFeedback,
  };
}
