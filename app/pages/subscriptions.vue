<template>
  <div class="space-y-6">
    <UiCard
      as="section"
      variant="bare"
      class="bg-gradient-to-br from-indigo-500/80 to-purple-500/80 p-6 text-white shadow-xl"
    >
      <div class="flex flex-wrap gap-6 items-end">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-white/70">
            Monthly burn
          </p>
          <h1 class="text-4xl font-semibold">
            {{ formatMoney(totalMonthly) }}
          </h1>
          <p class="text-sm text-white/80 mt-2">
            Across {{ recurringPayments.length }} active subscriptions
          </p>
        </div>
        <div class="ml-auto text-right">
          <p class="text-xs uppercase tracking-[0.3em] text-white/70">
            Next charge
          </p>
          <h2 class="text-2xl font-semibold">{{ nextCharge.label }}</h2>
          <p class="text-sm text-white/80">{{ nextCharge.detail }}</p>
        </div>
      </div>
      <div class="mt-6 grid gap-4 md:grid-cols-3 text-sm">
        <div>
          <p class="text-white/60 uppercase text-xs tracking-[0.3em]">
            Largest
          </p>
          <p class="text-lg font-semibold">
            {{ topSubscription?.merchant || '—' }}
          </p>
          <p v-if="topSubscription" class="text-white/70">
            {{ formatMoney(normalizeSubscription(topSubscription)) }} /
            {{ topSubscription.frequency }}
          </p>
        </div>
        <div>
          <p class="text-white/60 uppercase text-xs tracking-[0.3em]">
            Average ticket
          </p>
          <p class="text-lg font-semibold">
            {{ formatMoney(averageSubscription) }}
          </p>
        </div>
        <div>
          <p class="text-white/60 uppercase text-xs tracking-[0.3em]">
            Confidence
          </p>
          <p class="text-lg font-semibold">
            {{ Math.round(meanConfidence * 100) }}%
          </p>
          <p class="text-white/70">Model certainty</p>
        </div>
      </div>
    </UiCard>

    <UiCard as="section">
      <header class="flex flex-wrap items-center gap-2 mb-4">
        <div>
          <p class="text-xs text-slate-400">Upcoming charges</p>
          <h3 class="text-xl font-semibold text-white">Active Subscriptions</h3>
        </div>
        <span class="ml-auto text-xs text-slate-500"
          >{{ sortedSubscriptions.length }} scheduled</span
        >
      </header>

      <div class="divide-y divide-white/5">
        <article
          v-for="payment in sortedSubscriptions"
          :key="payment.merchant"
          class="py-4 flex items-center gap-4"
        >
          <div class="text-3xl">{{ CATEGORY_ICONS[payment.category] }}</div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <p class="font-medium text-white">{{ payment.merchant }}</p>
              <span
                :class="[
                  'text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider',
                  getStatus(payment).color,
                ]"
              >
                {{ getStatus(payment).label }}
              </span>
            </div>
            <p class="text-xs text-slate-500 capitalize">
              {{ payment.frequency }} •
              {{ formatConfidence(payment.confidence) }} •
              {{ payment.count }} times
            </p>
            <p class="text-xs text-slate-500">
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
            <p class="text-lg font-semibold text-rose-300">
              {{ formatMoney(normalizeSubscription(payment)) }}
            </p>
            <p class="text-xs text-slate-500">monthly equivalent</p>
          </div>
        </article>
        <div
          v-if="sortedSubscriptions.length === 0"
          class="py-8 text-center text-slate-500"
        >
          No recurring payments detected yet.
        </div>
      </div>
    </UiCard>

    <UiCard as="section">
      <header class="flex items-center justify-between mb-4">
        <div>
          <p class="text-xs text-slate-400">Category impact</p>
          <h3 class="text-xl font-semibold text-white">
            Where subscriptions live
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

const { detectRecurringPayments } = useTransactions();

const { formatCurrency } = useCurrency();

const recurringPayments = computed(() => detectRecurringPayments());

const normalizeSubscription = (payment: RecurringPayment) => {
  if (payment.frequency === 'weekly') return (payment.amount * 52) / 12;
  if (payment.frequency === 'yearly') return payment.amount / 12;
  return payment.amount;
};

const totalMonthly = computed(() =>
  recurringPayments.value.reduce(
    (sum, payment) => sum + normalizeSubscription(payment),
    0
  )
);

const topSubscription = computed(() => recurringPayments.value[0]);

const averageSubscription = computed(() => {
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

const sortedSubscriptions = computed(() => {
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
    const amount = normalizeSubscription(payment);
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
  if (!sortedSubscriptions.value.length) {
    return { label: formatMoney(0), detail: 'No upcoming charges' };
  }
  const next = sortedSubscriptions.value[0];
  const amount = formatMoney(normalizeSubscription(next));
  const date = next.nextExpectedDate || next.lastDate;
  return {
    label: amount,
    detail: `${next.merchant} on ${format(date, 'MMM d')}`,
  };
});

const formatConfidence = (confidence: number) =>
  `${Math.round(confidence * 100)}% confidence`;

const formatDate = (date: Date) => format(date, 'MMM d, yyyy');
</script>
