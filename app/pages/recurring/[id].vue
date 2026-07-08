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
          :name="descriptionName"
          :fallback="CATEGORIES[recurringPayment.category]?.icon"
          size="md"
        />
        <div>
          <p class="text-xs text-stone-500 dark:text-stone-400">
            Back to recurring
          </p>
          <h1 class="text-2xl font-semibold text-black dark:text-white">
            {{ getFirstLine(descriptionName) }}
          </h1>
        </div>
      </div>
    </div>

    <UiCard v-if="recurringPayment" padding="p-8">
      <div class="flex flex-wrap gap-6 items-end">
        <div>
          <p
            class="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2"
          >
            Average Amount
          </p>
          <h2
            class="text-5xl font-bold text-stone-900 dark:text-stone-100 tabular-nums"
          >
            {{ formatMoney(Math.abs(recurringPayment.amount)) }}
          </h2>
          <p class="text-sm text-stone-500 dark:text-stone-400 mt-2 capitalize">
            {{ recurringPayment.frequency }} •
            {{ relatedTransactions.length }} transactions
          </p>
        </div>
        <div class="ml-auto text-right">
          <p
            class="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1"
          >
            Next Expected
          </p>
          <h3
            class="text-2xl font-semibold text-stone-900 dark:text-stone-100 tabular-nums"
          >
            {{
              formatDate(
                recurringPayment.nextExpectedDate || recurringPayment.lastDate,
              )
            }}
          </h3>
          <p class="text-sm text-stone-500 dark:text-stone-400">
            {{
              formatDistanceToNow(
                recurringPayment.nextExpectedDate || recurringPayment.lastDate,
                { addSuffix: true },
              )
            }}
          </p>
        </div>
      </div>
      <div
        class="mt-6 pt-6 border-t border-stone-200 dark:border-stone-800 grid gap-4 md:grid-cols-3 text-sm"
      >
        <div>
          <p
            class="text-stone-500 dark:text-stone-400 uppercase text-xs tracking-wider mb-1"
          >
            Confidence
          </p>
          <p class="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {{ Math.round(recurringPayment.confidence * 100) }}%
          </p>
        </div>
        <div>
          <p
            class="text-stone-500 dark:text-stone-400 uppercase text-xs tracking-wider mb-1"
          >
            Category
          </p>
          <p
            class="text-lg font-semibold capitalize text-stone-900 dark:text-stone-100"
          >
            {{ CATEGORIES[recurringPayment.category]?.icon }}
            {{ recurringPayment.category }}
          </p>
        </div>
        <div>
          <p
            class="text-stone-500 dark:text-stone-400 uppercase text-xs tracking-wider mb-1"
          >
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

      <div class="divide-y divide-stone-200 dark:divide-stone-800 -mx-6">
        <article
          v-for="transaction in relatedTransactions"
          :key="transaction.id"
          class="px-6 py-4 flex items-start gap-4 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
        >
          <TransactionLogo
            :name="getFirstLine(transaction.description)"
            :fallback="CATEGORIES[transaction.category]?.icon"
            size="md"
            class="mt-1"
          />
          <div class="flex-1 min-w-0">
            <p
              class="font-medium truncate text-stone-900 dark:text-stone-100"
              :title="transaction.description"
            >
              {{ getFirstLine(transaction.description) }}
            </p>
            <p class="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {{ format(transaction.date, 'MMM d, yyyy') }} •
              <span class="capitalize">{{ transaction.category }}</span>
            </p>
          </div>
          <p
            class="font-semibold tabular-nums shrink-0"
            :class="
              transaction.amount > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-500'
            "
          >
            {{ transaction.amount > 0 ? '+' : '-'
            }}{{ formatMoney(Math.abs(transaction.amount)) }}
          </p>
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
import { db } from '~/utils/db';

const route = useRoute();
const paymentId = computed(() => route.params.id as string);

const getFirstLine = (text: string) => text.split('\n')[0] || text;

const { formatCurrency } = useCurrency();

const recurringPayment = ref<RecurringPayment | undefined>(undefined);
watch(
  paymentId,
  async (id) => {
    const row = await db.recurringPayments.get(id);
    if (!row) {
      recurringPayment.value = undefined;
      return;
    }
    const { cacheKey: _ck, ...rest } = row;
    recurringPayment.value = rest as RecurringPayment;
  },
  { immediate: true },
);

const descriptionName = computed(
  () => recurringPayment.value?.description ?? '',
);

// Fetch only the transactions referenced by this recurring payment from the DB.
const relatedTransactions = ref<Transaction[]>([]);
watch(
  () => recurringPayment.value?.transactionIds,
  async (ids) => {
    if (!ids?.length) {
      relatedTransactions.value = [];
      return;
    }
    const rows = await db.transactions.where('id').anyOf(ids).toArray();
    relatedTransactions.value = rows.toSorted(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  },
  { immediate: true },
);

const formatMoney = (value: number, options?: Intl.NumberFormatOptions) =>
  formatCurrency(value, {
    maximumFractionDigits: 2,
    ...options,
  });

const formatDate = (date: Date) => format(date, 'MMM d, yyyy');
</script>
