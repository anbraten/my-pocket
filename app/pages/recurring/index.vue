<template>
  <div class="space-y-6">
    <UiCard
      as="section"
      class="!bg-gradient-to-br !from-indigo-500 !to-purple-600 p-6 text-white !border-indigo-500"
    >
      <div class="flex flex-wrap gap-6 items-end">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-white/70">
            Monthly net
          </p>
          <h1 class="text-4xl font-semibold">
            {{ formatMoney(totalMonthly) }}
          </h1>
          <p class="text-sm text-white/80 mt-2">
            {{ recurringPayments.length }} recurring items
          </p>
          <div class="mt-3 flex gap-4 text-sm">
            <div>
              <span class="text-white/60">Income: </span>
              <span class="font-semibold text-emerald-300"
                >+{{ formatMoney(totalMonthlyIncome) }}</span
              >
            </div>
            <div>
              <span class="text-white/60">Expenses: </span>
              <span class="font-semibold text-rose-300"
                >-{{ formatMoney(totalMonthlyExpenses) }}</span
              >
            </div>
          </div>
        </div>
        <div class="ml-auto text-right">
          <p class="text-xs uppercase tracking-[0.3em] text-white/70">
            Next transaction
          </p>
          <h2 class="text-2xl font-semibold">{{ nextCharge.label }}</h2>
          <p class="text-sm text-white/80">{{ nextCharge.detail }}</p>
        </div>
      </div>
      <div class="mt-6 grid gap-4 md:grid-cols-3 text-sm">
        <div>
          <p class="text-white/60 uppercase text-xs tracking-[0.3em]">
            Largest expense
          </p>
          <p class="text-lg font-semibold">
            {{ topRecurring?.merchant || '—' }}
          </p>
          <p v-if="topRecurring" class="text-white/70">
            {{ formatMoney(Math.abs(normalizeRecurring(topRecurring))) }} /
            {{ topRecurring.frequency }}
          </p>
        </div>
        <div>
          <p class="text-white/60 uppercase text-xs tracking-[0.3em]">
            Average ticket
          </p>
          <p class="text-lg font-semibold">
            {{ formatMoney(averageRecurring) }}
          </p>
        </div>
        <div>
          <p class="text-white/60 uppercase text-xs tracking-[0.3em]">
            Confidence
          </p>
          <p class="text-lg font-semibold">
            {{ Math.round(meanConfidence * 100) }}%
          </p>
        </div>
      </div>
    </UiCard>

    <UiCard as="section">
      <header class="flex flex-wrap items-center gap-2 mb-4">
        <div>
          <p class="text-xs text-neutral-600 dark:text-neutral-400">
            Upcoming transactions
          </p>
          <h3 class="text-xl font-semibold text-black dark:text-white">
            Recurring Transactions
          </h3>
        </div>
        <span class="ml-auto text-xs text-neutral-600 dark:text-neutral-400"
          >{{ sortedRecurring.length }} scheduled</span
        >
      </header>

      <div class="divide-y divide-neutral-200 dark:divide-neutral-800">
        <article
          v-for="payment in sortedRecurring"
          :key="payment.merchant"
          class="py-4 flex items-center gap-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg transition-colors px-2 -mx-2"
          @click="showTransactions(payment)"
        >
          <div class="text-3xl">{{ CATEGORY_ICONS[payment.category] }}</div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <p class="font-medium text-black dark:text-white">
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
            <p
              class="text-xs text-neutral-600 dark:text-neutral-400 capitalize"
            >
              {{ payment.frequency }} •
              <span
                :class="{
                  'text-rose-400': payment.confidence < 0.5,
                }"
                >{{ formatConfidence(payment.confidence) }}</span
              >
              • {{ payment.count }} times
            </p>
            <p class="text-xs text-neutral-600 dark:text-neutral-400">
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
              class="text-lg font-semibold"
              :class="payment.amount > 0 ? 'text-emerald-400' : 'text-rose-300'"
            >
              {{ payment.amount > 0 ? '+' : '-'
              }}{{ formatMoney(Math.abs(normalizeRecurring(payment))) }}
            </p>
            <p class="text-xs text-slate-500">monthly equivalent</p>
          </div>
        </article>
        <div
          v-if="sortedRecurring.length === 0"
          class="py-8 text-center text-slate-500"
        >
          No recurring transactions detected yet.
        </div>
      </div>
    </UiCard>

    <UiCard as="section">
      <header class="flex items-center justify-between mb-4">
        <div>
          <p class="text-xs text-slate-400">Category impact</p>
          <h3 class="text-xl font-semibold text-white">
            Breakdown by category
          </h3>
        </div>
        <span class="text-xs text-slate-500"
          >{{ categoryBreakdown.length }} categories</span
        >
      </header>
      <div class="space-y-4">
        <div
          v-for="category in categoryBreakdown"
          :key="category.name"
          class="flex items-center gap-3"
        >
          <span class="text-2xl">{{ CATEGORY_ICONS[category.name] }}</span>
          <div class="flex-1">
            <div class="flex justify-between text-sm">
              <p class="capitalize">{{ category.name }}</p>
              <strong class="text-rose-200">{{
                formatMoney(category.total)
              }}</strong>
            </div>
            <div class="h-2 bg-white/5 rounded-full overflow-hidden mt-2">
              <div
                class="h-full rounded-full"
                :style="{
                  width: `${category.share}%`,
                  backgroundColor: CATEGORY_COLORS[category.name],
                }"
              ></div>
            </div>
          </div>
          <span class="text-xs text-slate-500"
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
import { CATEGORY_ICONS, CATEGORY_COLORS } from '~/utils/categories';
import type { RecurringPayment, Category } from '~/types';

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

// Show largest expense (not income) as top recurring
const topRecurring = computed(() => recurringExpenses.value[0]);

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
    .filter((payment) => payment.nextExpectedDate && payment.confidence >= 0.3)
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
    return { label: 'Overdue', color: 'text-rose-400 bg-rose-400/10' };
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
    return { label: 'Due soon', color: 'text-amber-400 bg-amber-400/10' };
  } else {
    return { label: 'Paid', color: 'text-emerald-400 bg-emerald-400/10' };
  }
};

const categoryBreakdown = computed(() => {
  const totals: Record<Category, number> = {} as Record<Category, number>;
  recurringPayments.value.forEach((payment) => {
    const amount = Math.abs(normalizeRecurring(payment));
    totals[payment.category] = (totals[payment.category] || 0) + amount;
  });

  const total = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
  return Object.entries(totals).map(([name, amount]) => ({
    name: name as Category,
    total: amount,
    share: total ? (amount / total) * 100 : 0,
  }));
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
