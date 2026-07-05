<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4 mb-6">
      <NuxtLink
        to="/recurring"
        class="text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
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
      <div class="flex items-center gap-3">
        <TransactionLogo
          v-if="recurringPayment"
          :name="merchantName"
          :fallback="CATEGORIES[recurringPayment.category]?.icon"
          size="md"
        />
        <div>
          <p class="text-xs text-stone-500 dark:text-stone-400">
            Back to recurring
          </p>
          <h1 class="text-2xl font-semibold text-black dark:text-white">
            {{ merchantName }}
          </h1>
        </div>
      </div>
    </div>

    <UiCard v-if="recurringPayment" padding="p-8">
      <div class="flex flex-wrap gap-6 items-end">
        <div>
          <p class="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
            Average Amount
          </p>
          <h2 class="text-5xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
            {{ formatMoney(Math.abs(recurringPayment.amount)) }}
          </h2>
          <p class="text-sm text-stone-500 dark:text-stone-400 mt-2 capitalize">
            {{ recurringPayment.frequency }} •
            {{ relatedTransactions.length }} transactions
          </p>
        </div>
        <div class="ml-auto text-right">
          <p class="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
            Next Expected
          </p>
          <h3 class="text-2xl font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
            {{
              formatDate(
                recurringPayment.nextExpectedDate || recurringPayment.lastDate
              )
            }}
          </h3>
          <p class="text-sm text-stone-500 dark:text-stone-400">
            {{
              formatDistanceToNow(
                recurringPayment.nextExpectedDate || recurringPayment.lastDate,
                { addSuffix: true }
              )
            }}
          </p>
        </div>
      </div>
      <div class="mt-6 pt-6 border-t border-stone-200 dark:border-stone-800 grid gap-4 md:grid-cols-3 text-sm">
        <div>
          <p class="text-stone-500 dark:text-stone-400 uppercase text-xs tracking-wider mb-1">
            Confidence
          </p>
          <p class="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {{ Math.round(recurringPayment.confidence * 100) }}%
          </p>
        </div>
        <div>
          <p class="text-stone-500 dark:text-stone-400 uppercase text-xs tracking-wider mb-1">
            Category
          </p>
          <p class="text-lg font-semibold capitalize text-stone-900 dark:text-stone-100">
            {{ CATEGORIES[recurringPayment.category]?.icon }}
            {{ recurringPayment.category }}
          </p>
        </div>
        <div>
          <p class="text-stone-500 dark:text-stone-400 uppercase text-xs tracking-wider mb-1">
            Last Transaction
          </p>
          <p class="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {{ formatDate(recurringPayment.lastDate) }}
          </p>
        </div>
      </div>
    </UiCard>

    <UiCard>
      <header class="flex items-center justify-between mb-4">
        <div>
          <p class="text-xs text-stone-500 dark:text-stone-400">
            Transaction history
          </p>
          <h3 class="text-xl font-semibold text-black dark:text-white">
            All Transactions
          </h3>
        </div>
        <span class="text-xs text-stone-500 dark:text-stone-400">
          {{ relatedTransactions.length }} total
        </span>
      </header>

      <div class="space-y-2">
        <article
          v-for="transaction in relatedTransactions"
          :key="transaction.id"
          class="py-3 px-3 flex items-center gap-4 hover:bg-stone-50 dark:hover:bg-stone-800/50 rounded-lg transition-colors"
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
            <p class="text-xs text-stone-500 dark:text-stone-400">
              {{ format(transaction.date, 'MMM d, yyyy') }} •
              <span class="capitalize">{{ transaction.category }}</span>
            </p>
          </div>
          <div class="text-right">
            <p
              class="text-lg font-semibold"
              :class="
                transaction.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
              "
            >
              {{ transaction.amount > 0 ? '+' : '-'
              }}{{ formatMoney(Math.abs(transaction.amount)) }}
            </p>
          </div>
        </article>
        <div
          v-if="relatedTransactions.length === 0"
          class="py-8 text-center text-stone-500"
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

// Get transactions related to this merchant using the IDs recorded during detection.
const relatedTransactions = computed((): Transaction[] => {
  if (!recurringPayment.value) return [];
  const ids = new Set(recurringPayment.value.transactionIds);
  return allTransactions.value
    .filter((t) => ids.has(t.id))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
});


const formatMoney = (value: number, options?: Intl.NumberFormatOptions) =>
  formatCurrency(value, {
    maximumFractionDigits: 2,
    ...options,
  });

const formatDate = (date: Date) => format(date, 'MMM d, yyyy');
</script>
