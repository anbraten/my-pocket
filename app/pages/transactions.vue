<template>
  <div class="space-y-6">
    <!-- Month Selector & Stats -->
    <UiCard>
      <div class="flex items-center justify-between mb-6">
        <button
          @click="previousMonth"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm font-medium"
          :disabled="!canGoPrevious"
          :class="{
            'opacity-40 cursor-not-allowed pointer-events-none': !canGoPrevious,
          }"
        >
          <span class="text-xl">←</span>
          <span class="hidden sm:inline">Previous</span>
        </button>
        <div class="text-center">
          <h1 class="text-2xl font-bold text-black dark:text-white">
            {{ selectedMonthLabel }}
          </h1>
          <button
            v-if="!isCurrentMonth"
            @click="goToCurrentMonth"
            class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1 font-medium"
          >
            Jump to current month
          </button>
        </div>
        <button
          @click="nextMonth"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm font-medium"
          :disabled="!canGoNext"
          :class="{
            'opacity-40 cursor-not-allowed pointer-events-none': !canGoNext,
          }"
        >
          <span class="hidden sm:inline">Next</span>
          <span class="text-xl">→</span>
        </button>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
          <p
            class="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-1"
          >
            Total Spent
          </p>
          <p class="text-2xl font-bold text-black dark:text-white">
            {{ formatMoney(selectedMonthStats.totalSpent) }}
          </p>
        </div>
        <div class="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
          <p
            class="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-1"
          >
            Transactions
          </p>
          <p class="text-2xl font-bold text-black dark:text-white">
            {{ selectedMonthStats.count }}
          </p>
        </div>
        <div class="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
          <p
            class="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-1"
          >
            Avg Amount
          </p>
          <p class="text-2xl font-bold text-black dark:text-white">
            {{ formatMoney(selectedMonthStats.avgTicket) }}
          </p>
        </div>
        <div class="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
          <p
            class="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-1"
          >
            Income
          </p>
          <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            +{{ formatMoney(selectedMonthStats.income) }}
          </p>
        </div>
      </div>
    </UiCard>

    <!-- Filters -->
    <UiCard v-if="showFilters">
      <div class="grid md:grid-cols-2 gap-4">
        <div>
          <label
            class="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-2 block"
          >
            Category
          </label>
          <UiSelect
            v-model="filterCategory"
            :options="categoryOptions"
            placeholder="All categories"
          />
        </div>
        <div>
          <label
            class="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-2 block"
          >
            Transaction Type
          </label>
          <UiSelect
            v-model="filterType"
            :options="typeOptions"
            placeholder="All transactions"
          />
        </div>
      </div>
    </UiCard>

    <!-- Transactions List -->
    <div class="flex items-center justify-between mb-3">
      <p class="text-sm text-neutral-600 dark:text-neutral-400">
        {{ selectedMonthTransactions.length }}
        {{
          selectedMonthTransactions.length === 1
            ? 'transaction'
            : 'transactions'
        }}
      </p>
      <UiButton variant="ghost" size="sm" @click="showFilters = !showFilters">
        {{ showFilters ? 'Hide' : 'Show' }} filters
      </UiButton>
    </div>

    <UiCard padding="p-0" class="overflow-hidden">
      <div class="divide-y divide-neutral-200 dark:divide-neutral-800">
        <article
          v-for="transaction in selectedMonthTransactions"
          :key="transaction.id"
          class="p-4 flex items-start gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
        >
          <div class="text-3xl mt-1">
            {{ CATEGORY_ICONS[transaction.category] }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p
                class="font-medium truncate text-black dark:text-white"
                :title="transaction.description"
              >
                {{ getFirstLine(transaction.description) }}
              </p>
              <span
                v-if="isRecurring(transaction)"
                class="text-xs bg-amber-400/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-400/30 font-medium"
                >Recurring</span
              >
              <span
                v-if="transaction.isAnomaly"
                class="text-xs bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded"
                >Anomaly</span
              >
            </div>
            <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
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
      </div>
    </UiCard>

    <div
      v-if="selectedMonthTransactions.length === 0"
      class="text-center py-12"
    >
      <UiCard>
        <p class="text-neutral-600 dark:text-neutral-400">
          No transactions found for {{ selectedMonthLabel }}.
        </p>
      </UiCard>
    </div>

    <!-- Add Transaction Button -->
    <button
      class="fixed bottom-28 right-6 md:bottom-8 md:right-10 h-14 w-14 rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl hover:bg-emerald-600 transition-all shadow-lg hover:shadow-xl"
      @click="showAddTransaction = true"
      aria-label="Add transaction"
    >
      ➕
    </button>

    <!-- Add Transaction Modal -->
    <Teleport to="body" v-if="showAddTransaction">
      <div
        class="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
      >
        <div
          class="bg-white dark:bg-neutral-900 rounded-lg w-full max-w-lg p-6 space-y-4 border border-neutral-200 dark:border-neutral-800"
          @click.stop
        >
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold text-black dark:text-white">
              Add Transaction
            </h2>
            <button
              @click="showAddTransaction = false"
              class="text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>

          <AddTransactionForm @close="showAddTransaction = false" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns';
import { CATEGORY_ICONS } from '~/utils/categories';
import { getMonthlyBudget } from '~/utils/budgets';
import type { Category } from '~/types';

const showAddTransaction = ref(false);

const {
  transactions,
  updateTransactionCategory,
  deleteTransaction: deleteTxn,
  detectRecurringPayments,
} = useTransactions();

const { formatCurrency } = useCurrency();
const { getSimilarity } = await import('~/utils/stringUtils');

const getFirstLine = (text: string) => text.split('\n')[0] || text;

const showFilters = ref(false);
const filterCategory = ref('');
const filterType = ref('');

// Month navigation
const selectedMonth = ref(new Date());

const selectedMonthKey = computed(() => format(selectedMonth.value, 'yyyy-MM'));

const selectedMonthLabel = computed(() =>
  format(selectedMonth.value, 'MMMM yyyy')
);

const isCurrentMonth = computed(() => {
  const now = new Date();
  return format(now, 'yyyy-MM') === selectedMonthKey.value;
});

const previousMonth = () => {
  const newDate = new Date(selectedMonth.value);
  newDate.setMonth(newDate.getMonth() - 1);
  selectedMonth.value = newDate;
};

const nextMonth = () => {
  const newDate = new Date(selectedMonth.value);
  newDate.setMonth(newDate.getMonth() + 1);
  selectedMonth.value = newDate;
};

const goToCurrentMonth = () => {
  selectedMonth.value = new Date();
};

// Check if we can navigate
const canGoPrevious = computed(() => {
  if (transactions.value.length === 0) return false;
  const oldestTransaction = [...transactions.value].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )[0];
  if (!oldestTransaction) return false;
  const oldestMonth = format(oldestTransaction.date, 'yyyy-MM');
  return selectedMonthKey.value > oldestMonth;
});

const canGoNext = computed(() => {
  const now = new Date();
  const currentMonth = format(now, 'yyyy-MM');
  return selectedMonthKey.value < currentMonth;
});

// Get recurring payments
const recurringPayments = computed(() => detectRecurringPayments());

// Check if a transaction is recurring
const isRecurring = (transaction: (typeof transactions.value)[0]) => {
  const merchant = (
    transaction.merchant ??
    transaction.description.split(' ')[0] ??
    ''
  )
    .toLowerCase()
    .trim();

  return recurringPayments.value.some((payment) => {
    const paymentMerchant = payment.merchant.toLowerCase().trim();
    return (
      merchant.includes(paymentMerchant) ||
      paymentMerchant.includes(merchant) ||
      getSimilarity(merchant, paymentMerchant) > 0.8
    );
  });
};

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

const typeOptions = [
  { label: 'All transactions', value: '' },
  { label: 'Recurring only', value: 'recurring' },
  { label: 'Variable only', value: 'variable' },
];

// Get transactions for selected month
const selectedMonthTransactions = computed(() => {
  let filtered = transactions.value.filter((t) => {
    const txMonth = format(t.date, 'yyyy-MM');
    return txMonth === selectedMonthKey.value;
  });

  if (filterCategory.value) {
    filtered = filtered.filter((t) => t.category === filterCategory.value);
  }

  if (filterType.value === 'recurring') {
    filtered = filtered.filter((t) => isRecurring(t));
  } else if (filterType.value === 'variable') {
    filtered = filtered.filter((t) => !isRecurring(t));
  }

  return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
});

// Calculate stats for selected month
const selectedMonthStats = computed(() => {
  const monthTransactions = transactions.value.filter((t) => {
    const txMonth = format(t.date, 'yyyy-MM');
    return txMonth === selectedMonthKey.value;
  });

  const expenses = monthTransactions.filter((t) => t.amount < 0);
  const income = monthTransactions.filter((t) => t.amount > 0);

  const totalSpent = Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0));
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

  return {
    count: monthTransactions.length,
    totalSpent,
    income: totalIncome,
    avgTicket: expenses.length > 0 ? totalSpent / expenses.length : 0,
  };
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
