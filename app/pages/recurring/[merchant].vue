<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4 mb-6">
      <NuxtLink
        to="/recurring"
        class="text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
      >
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </NuxtLink>
      <div>
        <p class="text-xs text-neutral-600 dark:text-neutral-400">
          Back to recurring
        </p>
        <h1 class="text-2xl font-semibold text-black dark:text-white">
          {{ merchantName }}
        </h1>
      </div>
    </div>

    <UiCard
      v-if="recurringPayment"
      class="!bg-gradient-to-br !from-indigo-500 !to-purple-600 p-6 text-white !border-indigo-500"
    >
      <div class="flex flex-wrap gap-6 items-end">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-white/70">
            Average Amount
          </p>
          <h2 class="text-4xl font-semibold">
            {{ formatMoney(Math.abs(recurringPayment.amount)) }}
          </h2>
          <p class="text-sm text-white/80 mt-2 capitalize">
            {{ recurringPayment.frequency }} •
            {{ relatedTransactions.length }} transactions
          </p>
        </div>
        <div class="ml-auto text-right">
          <p class="text-xs uppercase tracking-[0.3em] text-white/70">
            Next Expected
          </p>
          <h3 class="text-2xl font-semibold">
            {{
              formatDate(
                recurringPayment.nextExpectedDate || recurringPayment.lastDate
              )
            }}
          </h3>
          <p class="text-sm text-white/80">
            {{
              formatDistanceToNow(
                recurringPayment.nextExpectedDate || recurringPayment.lastDate,
                { addSuffix: true }
              )
            }}
          </p>
        </div>
      </div>
      <div class="mt-6 grid gap-4 md:grid-cols-3 text-sm">
        <div>
          <p class="text-white/60 uppercase text-xs tracking-[0.3em]">
            Confidence
          </p>
          <p class="text-lg font-semibold">
            {{ Math.round(recurringPayment.confidence * 100) }}%
          </p>
        </div>
        <div>
          <p class="text-white/60 uppercase text-xs tracking-[0.3em]">
            Category
          </p>
          <p class="text-lg font-semibold capitalize">
            {{ CATEGORIES[recurringPayment.category]?.icon }}
            {{ recurringPayment.category }}
          </p>
        </div>
        <div>
          <p class="text-white/60 uppercase text-xs tracking-[0.3em]">
            Last Transaction
          </p>
          <p class="text-lg font-semibold">
            {{ formatDate(recurringPayment.lastDate) }}
          </p>
        </div>
      </div>
    </UiCard>

    <UiCard>
      <header class="flex items-center justify-between mb-4">
        <div>
          <p class="text-xs text-neutral-600 dark:text-neutral-400">
            Transaction history
          </p>
          <h3 class="text-xl font-semibold text-black dark:text-white">
            All Transactions
          </h3>
        </div>
        <span class="text-xs text-neutral-600 dark:text-neutral-400">
          {{ relatedTransactions.length }} total
        </span>
      </header>

      <div class="space-y-2">
        <article
          v-for="transaction in relatedTransactions"
          :key="transaction.id"
          class="py-3 px-3 flex items-center gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg transition-colors"
        >
          <div class="text-2xl">
            {{ CATEGORIES[transaction.category]?.icon }}
          </div>
          <div class="flex-1">
            <p
              class="font-medium text-black dark:text-white whitespace-pre-wrap"
            >
              {{ transaction.description }}
            </p>
            <p class="text-xs text-neutral-600 dark:text-neutral-400">
              {{ format(transaction.date, 'MMM d, yyyy') }} •
              <span class="capitalize">{{ transaction.category }}</span>
            </p>
          </div>
          <div class="text-right">
            <p
              class="text-lg font-semibold"
              :class="
                transaction.amount > 0 ? 'text-emerald-400' : 'text-rose-300'
              "
            >
              {{ transaction.amount > 0 ? '+' : '-'
              }}{{ formatMoney(Math.abs(transaction.amount)) }}
            </p>
          </div>
        </article>
        <div
          v-if="relatedTransactions.length === 0"
          class="py-8 text-center text-neutral-500"
        >
          No transactions found for this merchant.
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { format, formatDistanceToNow } from 'date-fns';
import { CATEGORIES } from '~/utils/categories';
import type { Transaction, RecurringPayment } from '~/types';

const route = useRoute();
const merchantName = computed(() =>
  decodeURIComponent(route.params.merchant as string)
);

const { detectRecurringPayments, transactions: allTransactions } =
  useTransactions();
const { formatCurrency } = useCurrency();

const recurringPayments = computed(() => detectRecurringPayments());

// Find the recurring payment that matches the merchant
const recurringPayment = computed((): RecurringPayment | undefined => {
  return recurringPayments.value.find(
    (p) => p.merchant.toLowerCase() === merchantName.value.toLowerCase()
  );
});

// Get transactions related to this merchant
const relatedTransactions = computed((): Transaction[] => {
  const merchantLower = merchantName.value.toLowerCase().trim();

  return allTransactions.value
    .filter((t) => {
      const transactionMerchant = (
        t.merchant ??
        t.description.split(' ')[0] ??
        ''
      )
        .toLowerCase()
        .trim();

      // Use fuzzy matching to find similar merchants
      const similarity = getSimilarity(transactionMerchant, merchantLower);
      return similarity > 0.8;
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
});

// Helper function for fuzzy string matching
const getSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = (s1: string, s2: string): number => {
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1] ?? 0;
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue =
              Math.min(Math.min(newValue, lastValue), costs[j] ?? 0) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length] ?? 0;
  };

  return (longer.length - editDistance(longer, shorter)) / longer.length;
};

const formatMoney = (value: number, options?: Intl.NumberFormatOptions) =>
  formatCurrency(value, {
    maximumFractionDigits: 2,
    ...options,
  });

const formatDate = (date: Date) => format(date, 'MMM d, yyyy');
</script>
