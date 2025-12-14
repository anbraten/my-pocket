<template>
  <div class="space-y-6">
    <UiCard as="section">
      <div class="flex flex-wrap items-end gap-4">
        <div>
          <p class="text-xs text-slate-400">This month</p>
          <h1 class="text-3xl font-semibold">
            {{ formatMoney(monthlyExpenseTotal) }} spent
          </h1>
        </div>
        <div class="ml-auto text-right">
          <p class="text-xs text-slate-400">Budget remaining</p>
          <p class="text-lg font-medium">{{ formatMoney(remainingBudget) }}</p>
        </div>
      </div>
      <div class="mt-4 grid gap-3 md:grid-cols-3 text-sm text-slate-400">
        <div>
          <p class="text-xs uppercase tracking-[0.3em]">Transactions</p>
          <p class="text-base text-white font-semibold">{{ monthlyCount }}</p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-[0.3em]">Avg ticket</p>
          <p class="text-base text-white font-semibold">
            {{ formatMoney(averageTicket) }}
          </p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-[0.3em]">Filters</p>
          <UiButton
            variant="ghost"
            size="sm"
            class="flex items-center gap-2 text-white"
            @click="showFilters = !showFilters"
          >
            {{ showFilters ? 'Hide filters' : 'Show filters' }}
            <span>🔍</span>
          </UiButton>
        </div>
      </div>
    </UiCard>

    <UiCard as="section" v-if="showFilters" class="space-y-4">
      <div>
        <label class="text-xs uppercase tracking-[0.3em] text-slate-400"
          >Category</label
        >
        <div class="mt-2">
          <UiSelect
            v-model="filterCategory"
            :options="categoryOptions"
            placeholder="All categories"
          />
        </div>
      </div>
    </UiCard>

    <UiCard as="section" padding="p-0" class="overflow-hidden">
      <div class="divide-y divide-white/5">
        <article
          v-for="transaction in filteredTransactions"
          :key="transaction.id"
          class="p-4 flex items-start gap-4"
        >
          <div class="text-3xl mt-1">
            {{ CATEGORY_ICONS[transaction.category] }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-medium truncate">
                {{ getFirstLine(transaction.description) }}
              </p>
              <span
                v-if="transaction.isAnomaly"
                class="text-xs bg-orange-500/20 text-orange-200 px-2 py-1 rounded-full"
                >Anomaly</span
              >
              <span
                v-if="transaction.isRecurring"
                class="text-xs bg-indigo-500/20 text-indigo-200 px-2 py-1 rounded-full"
                >Recurring</span
              >
            </div>
            <p class="text-xs text-slate-500 mt-1">
              {{ formatDate(transaction.date) }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <UiSelect
                :model-value="transaction.category"
                :options="categoryOptions"
                size="sm"
                @update:modelValue="(value) =>
                  updateCategory(transaction.id, value as Category)
                "
              />
              <UiButton
                variant="ghost"
                size="sm"
                class="text-rose-300 hover:text-rose-200"
                @click="deleteTransaction(transaction.id)"
              >
                Delete
              </UiButton>
            </div>
          </div>
          <p
            :class="
              transaction.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
            "
            class="font-semibold"
          >
            {{ formatSignedMoney(transaction.amount) }}
          </p>
        </article>

        <div
          v-if="filteredTransactions.length === 0"
          class="py-12 text-center text-slate-500"
        >
          No transactions found.
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns';
import { CATEGORY_ICONS } from '~/utils/categories';
import { MONTHLY_BUDGET } from '~/utils/budgets';
import type { Category } from '~/types';

const {
  transactions,
  monthlyTransactions,
  monthlyExpenses,
  updateTransactionCategory,
  deleteTransaction: deleteTxn,
} = useTransactions();

const { formatCurrency } = useCurrency();

const getFirstLine = (text: string) => text.split('\n')[0] || text;

const showFilters = ref(false);
const filterCategory = ref('');

const categories: Category[] = [
  'groceries',
  'dining',
  'transport',
  'entertainment',
  'utilities',
  'shopping',
  'health',
  'income',
  'transfer',
  'other',
];

const categoryOptions = computed(() =>
  categories.map((cat) => ({
    label: capitalize(cat),
    value: cat,
  }))
);

const filteredTransactions = computed(() => {
  let filtered = transactions.value;

  if (filterCategory.value) {
    filtered = filtered.filter((t) => t.category === filterCategory.value);
  }

  return filtered;
});

const monthlyExpenseTotal = computed(() =>
  Math.abs(monthlyExpenses.value.reduce((sum, t) => sum + t.amount, 0))
);

const remainingBudget = computed(() =>
  Math.max(0, MONTHLY_BUDGET - monthlyExpenseTotal.value)
);

const monthlyCount = computed(() => monthlyTransactions.value.length);

const averageTicket = computed(() => {
  if (monthlyExpenses.value.length === 0) return 0;
  return monthlyExpenseTotal.value / monthlyExpenses.value.length;
});

const formatDate = (date: Date) => format(date, 'MMM d, yyyy');

const formatMoney = (value: number, options?: Intl.NumberFormatOptions) =>
  formatCurrency(value, {
    maximumFractionDigits: 0,
    ...options,
  });

const formatSignedMoney = (value: number) => {
  const formatted = formatMoney(Math.abs(value), {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
};

const updateCategory = (id: string, category: string) => {
  updateTransactionCategory(id, category as Category);
};

const deleteTransaction = (id: string) => {
  if (confirm('Delete this transaction?')) {
    deleteTxn(id);
  }
};

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);
</script>
