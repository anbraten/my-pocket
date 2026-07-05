<template>
  <div class="space-y-6">
    <UiCard as="section" padding="p-8">
      <div class="flex flex-wrap gap-6 items-end">
        <div>
          <p class="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
            Monthly net
          </p>
          <h1 class="text-5xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
            {{ formatMoney(totalMonthly) }}
          </h1>
          <p class="text-sm text-stone-500 dark:text-stone-400 mt-2">
            {{ recurringPayments.length }} recurring items
          </p>
          <div class="mt-3 flex gap-4 text-sm">
            <div>
              <span class="text-stone-500 dark:text-stone-400">Income: </span>
              <span class="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums"
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
          <p class="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
            Next transaction
          </p>
          <h2 class="text-2xl font-semibold text-stone-900 dark:text-stone-100 tabular-nums">{{ nextCharge.label }}</h2>
          <p class="text-sm text-stone-500 dark:text-stone-400">{{ nextCharge.detail }}</p>
        </div>
      </div>
      <div class="mt-6 pt-6 border-t border-stone-200 dark:border-stone-800 grid gap-4 md:grid-cols-3 text-sm">
        <div>
          <p class="text-stone-500 dark:text-stone-400 uppercase text-xs tracking-wider mb-1">
            Largest expense
          </p>
          <p class="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {{ topRecurring?.merchant || '—' }}
          </p>
          <p v-if="topRecurring" class="text-stone-500 dark:text-stone-400 tabular-nums">
            {{ formatMoney(Math.abs(normalizeRecurring(topRecurring))) }} /
            {{ topRecurring.frequency }}
          </p>
        </div>
        <div>
          <p class="text-stone-500 dark:text-stone-400 uppercase text-xs tracking-wider mb-1">
            Average ticket
          </p>
          <p class="text-lg font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
            {{ formatMoney(averageRecurring) }}
          </p>
        </div>
        <div>
          <p class="text-stone-500 dark:text-stone-400 uppercase text-xs tracking-wider mb-1">
            Confidence
          </p>
          <p class="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {{ Math.round(meanConfidence * 100) }}%
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
        <span class="ml-auto text-xs text-stone-500 dark:text-stone-400"
          >{{ sortedRecurring.length }} scheduled</span
        >
      </header>

      <div class="divide-y divide-stone-200 dark:divide-stone-800">
        <article
          v-for="payment in sortedRecurring"
          :key="payment.merchant"
          class="py-4 flex items-center gap-4 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/50 rounded-lg transition-colors px-2 -mx-2"
          @click="showTransactions(payment)"
        >
          <TransactionLogo
            :name="payment.merchant"
            :fallback="CATEGORIES[payment.category]?.icon"
            size="md"
          />
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <p class="font-medium text-stone-900 dark:text-stone-100">
                {{ payment.merchant }}
              </p>
              <span
                :class="[
                  'text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider',
                  getStatus(payment).color,
                ]"
              >
                {{ getStatus(payment).label }}
              </span>
            </div>
            <p class="text-xs text-stone-500 dark:text-stone-400 capitalize">
              {{ payment.frequency }} •
              <span :class="{ 'text-rose-500': payment.confidence < 0.5 }">
                {{ formatConfidence(payment.confidence) }}
              </span>
              • {{ payment.count }} times
            </p>
            <p class="text-xs text-stone-500 dark:text-stone-400">
              Next on
              {{ formatDate(payment.nextExpectedDate || payment.lastDate) }} ({{
                formatDistanceToNow(
                  payment.nextExpectedDate || payment.lastDate,
                  { addSuffix: true }
                )
              }})
            </p>
          </div>
          <div class="text-right">
            <p
              class="text-base font-semibold tabular-nums"
              :class="payment.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'"
            >
              {{ payment.amount > 0 ? '+' : '-'
              }}{{ formatMoney(Math.abs(normalizeRecurring(payment))) }}
            </p>
            <p class="text-xs text-stone-500 dark:text-stone-400">monthly</p>
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

    <UiCard as="section">
      <header class="flex items-center justify-between mb-4">
        <div>
          <p class="text-xs text-stone-500 dark:text-stone-400">Category impact</p>
          <h3 class="text-xl font-semibold text-stone-900 dark:text-stone-100">
            Breakdown by category
          </h3>
        </div>
        <span class="text-xs text-stone-500 dark:text-stone-400"
          >{{ categoryBreakdown.length }} categories</span
        >
      </header>
      <div class="space-y-4">
        <div
          v-for="category in categoryBreakdown"
          :key="category.name"
          class="flex items-center gap-3"
        >
          <span class="text-xl">{{ CATEGORIES[category.name]?.icon }}</span>
          <div class="flex-1">
            <div class="flex justify-between text-sm">
              <p class="capitalize text-stone-900 dark:text-stone-100">{{ category.name }}</p>
              <strong class="text-stone-600 dark:text-stone-300 tabular-nums">{{
                formatMoney(category.total)
              }}</strong>
            </div>
            <div class="h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden mt-2">
              <div
                class="h-full rounded-full bg-violet-500"
                :style="{ width: `${category.share}%` }"
              />
            </div>
          </div>
          <span class="text-xs text-stone-500 dark:text-stone-400"
            >{{ Math.round(category.share) }}%</span
          >
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
import { CATEGORIES, type Category } from '~/utils/categories';
import type { RecurringPayment } from '~/types';

const { detectRecurringPayments, refreshRecurringPatterns } = useTransactions();

const { formatCurrency } = useCurrency();

const recurringPayments = computed(() => detectRecurringPayments());

// Refresh patterns on mount if we have transactions
onMounted(() => {
  if (recurringPayments.value.length === 0) {
    refreshRecurringPatterns();
  }
});

const recurringIncome = computed(() =>
  recurringPayments.value.filter((p) => p.amount > 0)
);

const recurringExpenses = computed(() =>
  recurringPayments.value.filter((p) => p.amount < 0)
);

const normalizeRecurring = (payment: RecurringPayment) => {
  const monthlyAmount = (() => {
    if (payment.frequency === 'weekly') return (payment.amount * 52) / 12;
    if (payment.frequency === 'yearly') return payment.amount / 12;
    return payment.amount;
  })();

  // Return the absolute value for calculations
  return Math.abs(monthlyAmount);
};

const totalMonthlyIncome = computed(() =>
  Math.abs(
    recurringIncome.value.reduce(
      (sum, payment) => sum + normalizeRecurring(payment),
      0
    )
  )
);

const totalMonthlyExpenses = computed(() =>
  recurringExpenses.value.reduce(
    (sum, payment) => sum + normalizeRecurring(payment),
    0
  )
);

const totalMonthly = computed(
  () => totalMonthlyIncome.value - totalMonthlyExpenses.value
);

// Show largest expense by normalized monthly amount
const topRecurring = computed(() =>
  recurringExpenses.value.reduce<RecurringPayment | undefined>(
    (max, p) => (!max || normalizeRecurring(p) > normalizeRecurring(max) ? p : max),
    undefined
  )
);

const averageRecurring = computed(() => {
  if (!recurringPayments.value.length) return 0;
  return totalMonthly.value / recurringPayments.value.length;
});

const meanConfidence = computed(() => {
  if (!recurringPayments.value.length) return 0;
  return (
    recurringPayments.value.reduce(
      (sum, payment) => sum + payment.confidence,
      0
    ) / recurringPayments.value.length
  );
});

const sortedRecurring = computed(() => {
  if (!recurringPayments.value.length) return [];

  return [...recurringPayments.value]
    .filter((payment) => payment.nextExpectedDate)
    .sort(
      (a, b) =>
        (a.nextExpectedDate as Date).getTime() -
        (b.nextExpectedDate as Date).getTime()
    );
});

const getStatus = (payment: RecurringPayment) => {
  const now = new Date();
  const nextDate = payment.nextExpectedDate || payment.lastDate;

  if (isPast(nextDate) && !isToday(nextDate)) {
    return { label: 'Overdue', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-400/10' };
  }

  let isDueThisPeriod = false;
  if (payment.frequency === 'monthly') {
    isDueThisPeriod = isSameMonth(nextDate, now);
  } else if (payment.frequency === 'yearly') {
    isDueThisPeriod = isSameYear(nextDate, now);
  } else if (payment.frequency === 'weekly') {
    isDueThisPeriod = isSameISOWeek(nextDate, now);
  }

  if (isDueThisPeriod) {
    return { label: 'Due soon', color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-400/10' };
  } else {
    return { label: 'Paid', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10' };
  }
};

const categoryBreakdown = computed(() => {
  const totals: Record<Category, number> = {} as Record<Category, number>;
  recurringPayments.value
    .filter((p) => p.amount < 0)
    .forEach((payment) => {
      const amount = Math.abs(normalizeRecurring(payment));
      totals[payment.category] = (totals[payment.category] || 0) + amount;
    });

  const total = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
  return Object.entries(totals)
    .map(([name, amount]) => ({
      name: name as Category,
      total: amount,
      share: total ? (amount / total) * 100 : 0,
    }))
    .toSorted((a, b) => b.total - a.total);
});

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
    detail: `${next.merchant} on ${format(date, 'MMM d')}`,
  };
});

const formatConfidence = (confidence: number) =>
  `${Math.round(confidence * 100)}% confidence`;

const formatDate = (date: Date) => format(date, 'MMM d, yyyy');

const showTransactions = (payment: RecurringPayment) => {
  navigateTo(`/recurring/${encodeURIComponent(payment.merchant)}`);
};
</script>
