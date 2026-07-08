<template>
  <div class="space-y-6">
    <UiCard as="section" padding="p-8">
      <div class="flex flex-wrap gap-6 items-end">
        <div>
          <p
            class="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2"
          >
            Monthly net
          </p>
          <h1
            class="text-5xl font-bold text-stone-900 dark:text-stone-100 tabular-nums"
          >
            {{ formatMoney(totalMonthly) }}
          </h1>
          <p class="text-sm text-stone-500 dark:text-stone-400 mt-2">
            {{ recurringPayments.length }} recurring items
          </p>
          <div class="mt-3 flex gap-4 text-sm">
            <div>
              <span class="text-stone-500 dark:text-stone-400">Income: </span>
              <span
                class="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums"
                >+{{ formatMoney(totalMonthlyIncome) }}</span
              >
            </div>
            <div>
              <span class="text-stone-500 dark:text-stone-400">Expenses: </span>
              <span class="font-semibold text-rose-500 tabular-nums"
                >-{{ formatMoney(totalMonthlyExpenses) }}</span
              >
            </div>
          </div>
        </div>
        <div class="ml-auto text-right">
          <p
            class="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1"
          >
            Next transaction
          </p>
          <h2
            class="text-2xl font-semibold text-stone-900 dark:text-stone-100 tabular-nums"
          >
            {{ nextCharge.label }}
          </h2>
          <p class="text-sm text-stone-500 dark:text-stone-400">
            {{ nextCharge.detail }}
          </p>
        </div>
      </div>
    </UiCard>

    <UiCard as="section">
      <header class="flex flex-wrap items-center gap-2 mb-4">
        <div>
          <p class="text-xs text-stone-500 dark:text-stone-400">
            Upcoming transactions
          </p>
          <h3 class="text-xl font-semibold text-stone-900 dark:text-stone-100">
            Recurring Transactions
          </h3>
        </div>
        <div class="ml-auto flex items-center gap-2">
          <span class="text-xs text-stone-500 dark:text-stone-400"
            >{{ sortedRecurring.length }} scheduled</span
          >
          <div
            class="flex rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden text-xs"
          >
            <button
              class="px-2.5 py-1 transition-colors"
              :class="
                sortBy === 'due'
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium'
                  : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              "
              @click="sortBy = 'due'"
            >
              Next due
            </button>
            <button
              class="px-2.5 py-1 transition-colors border-l border-stone-200 dark:border-stone-700"
              :class="
                sortBy === 'amount'
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium'
                  : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              "
              @click="sortBy = 'amount'"
            >
              Highest amount
            </button>
          </div>
        </div>
      </header>

      <div class="divide-y divide-stone-200 dark:divide-stone-800">
        <article
          v-for="payment in sortedRecurring"
          :key="payment.description"
          class="p-4 flex items-start gap-4 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
          @click="showTransactions(payment)"
        >
          <TransactionLogo
            :name="getFirstLine(payment.description)"
            :fallback="CATEGORIES[payment.category]?.icon"
            size="md"
            class="mt-1"
          />
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p
                class="font-medium truncate text-stone-900 dark:text-stone-100"
                :title="payment.description"
              >
                {{ getFirstLine(payment.description) }}
              </p>
              <span
                :class="[
                  'text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider shrink-0',
                  getStatus(payment).color,
                ]"
              >
                {{ getStatus(payment).label }}
              </span>
            </div>
            <p
              class="text-xs text-stone-500 dark:text-stone-400 mt-1 capitalize"
            >
              {{ payment.frequency }} •
              <span :class="{ 'text-rose-500': payment.confidence < 0.5 }">
                {{ formatConfidence(payment.confidence) }}
              </span>
              • next
              {{
                formatDistanceToNow(
                  payment.nextExpectedDate || payment.lastDate,
                  { addSuffix: true },
                )
              }}
            </p>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <div class="flex gap-1" @click.stop>
              <button
                title="Confirm — this is a real recurring payment"
                class="p-1.5 rounded-md text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-400/10 transition-colors"
                @click="giveFeedback(payment, true)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <button
                title="Dismiss — not actually recurring"
                class="p-1.5 rounded-md text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-400/10 transition-colors"
                @click="giveFeedback(payment, false)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div class="text-right">
              <p
                class="font-semibold tabular-nums"
                :class="
                  payment.amount > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-500'
                "
              >
                {{ payment.amount > 0 ? '+' : '-'
                }}{{ formatMoney(Math.abs(normalizeRecurring(payment))) }}
              </p>
              <p class="text-xs text-stone-500 dark:text-stone-400">/ month</p>
            </div>
          </div>
        </article>
        <div
          v-if="sortedRecurring.length === 0"
          class="py-8 text-center text-stone-500 dark:text-stone-400"
        >
          No recurring transactions detected yet.
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import {
  format,
  formatDistanceToNow,
  isSameMonth,
  isSameYear,
  isSameISOWeek,
  isPast,
  isToday,
} from 'date-fns';
import { CATEGORIES } from '~/utils/categories';
import type { RecurringPayment } from '~/types';

const {
  recurringPayments,
  runRecurringDetection,
  giveFeedback,
  clearRecurringData,
} = useRecurring();

const getFirstLine = (text: string) => text.split('\n')[0] || text;

const { formatCurrency } = useCurrency();
const route = useRoute();

// Refresh patterns on mount if we have transactions
onMounted(async () => {
  const force = !!route.query.refresh;
  if (force) {
    await clearRecurringData();
  }

  runRecurringDetection();
});

const recurringIncome = computed(() =>
  recurringPayments.value.filter((p) => p.amount > 0),
);

const recurringExpenses = computed(() =>
  recurringPayments.value.filter((p) => p.amount < 0),
);

const normalizeRecurring = (payment: RecurringPayment) => {
  const monthlyAmount = (() => {
    if (payment.frequency === 'weekly') return (payment.amount * 52) / 12;
    if (payment.frequency === 'biweekly') return (payment.amount * 26) / 12;
    if (payment.frequency === 'quarterly') return payment.amount / 3;
    if (payment.frequency === 'yearly') return payment.amount / 12;
    return payment.amount;
  })();

  return Math.abs(monthlyAmount);
};

const totalMonthlyIncome = computed(() =>
  Math.abs(
    recurringIncome.value.reduce(
      (sum, payment) => sum + normalizeRecurring(payment),
      0,
    ),
  ),
);

const totalMonthlyExpenses = computed(() =>
  recurringExpenses.value.reduce(
    (sum, payment) => sum + normalizeRecurring(payment),
    0,
  ),
);

const totalMonthly = computed(
  () => totalMonthlyIncome.value - totalMonthlyExpenses.value,
);

const sortBy = ref<'due' | 'amount'>('amount');

const sortedRecurring = computed(() => {
  if (!recurringPayments.value.length) return [];

  if (sortBy.value === 'amount') {
    return recurringPayments.value.toSorted((a, b) => b.amount - a.amount);
  }

  return recurringPayments.value
    .filter((payment) => payment.nextExpectedDate)
    .toSorted(
      (a, b) =>
        (a.nextExpectedDate as Date).getTime() -
        (b.nextExpectedDate as Date).getTime(),
    );
});

const getStatus = (payment: RecurringPayment) => {
  const now = new Date();
  const nextDate = payment.nextExpectedDate || payment.lastDate;

  if (isPast(nextDate) && !isToday(nextDate)) {
    return {
      label: 'Overdue',
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-400/10',
    };
  }

  let isDueThisPeriod = false;
  if (payment.frequency === 'monthly') {
    isDueThisPeriod = isSameMonth(nextDate, now);
  } else if (payment.frequency === 'quarterly') {
    isDueThisPeriod = isSameMonth(nextDate, now);
  } else if (payment.frequency === 'yearly') {
    isDueThisPeriod = isSameYear(nextDate, now);
  } else if (
    payment.frequency === 'weekly' ||
    payment.frequency === 'biweekly'
  ) {
    isDueThisPeriod = isSameISOWeek(nextDate, now);
  }

  if (isDueThisPeriod) {
    return {
      label: 'Due soon',
      color:
        'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-400/10',
    };
  } else {
    return {
      label: 'Paid',
      color:
        'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10',
    };
  }
};

const formatMoney = (value: number, options?: Intl.NumberFormatOptions) =>
  formatCurrency(value, {
    maximumFractionDigits: 2,
    ...options,
  });

const nextCharge = computed(() => {
  if (!sortedRecurring.value.length) {
    return { label: formatMoney(0), detail: 'No upcoming transactions' };
  }
  const next = sortedRecurring.value[0];
  if (!next) {
    return { label: formatMoney(0), detail: 'No upcoming transactions' };
  }
  const amount = formatMoney(Math.abs(normalizeRecurring(next)));
  const date = next.nextExpectedDate || next.lastDate;
  return {
    label: amount,
    detail: `${getFirstLine(next.description)} on ${format(date, 'MMM d')}`,
  };
});

const formatConfidence = (confidence: number) =>
  `${Math.round(confidence * 100)}% confidence`;

const showTransactions = (payment: RecurringPayment) => {
  navigateTo(`/recurring/${encodeURIComponent(payment.id)}`);
};
</script>
