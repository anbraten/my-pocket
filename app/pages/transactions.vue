<template>
  <div class="space-y-6">
    <!-- Search Bar -->
    <div class="relative">
      <svg
        class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
        />
      </svg>
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Search all transactions..."
        class="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-stone-900 dark:text-stone-100 placeholder-stone-400"
      />
    </div>

    <!-- Month Selector & Stats -->
    <UiCard v-if="!isSearchMode">
      <div class="flex items-center justify-between mb-6">
        <UiButton
          :disabled="!canGoPrevious"
          :class="{
            'opacity-40 cursor-not-allowed pointer-events-none': !canGoPrevious,
          }"
          @click="previousMonth"
        >
          <span class="text-xl">←</span>
          <span class="hidden sm:inline">Previous</span>
        </UiButton>
        <div class="text-center">
          <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">
            {{ selectedMonthLabel }}
          </h1>
          <button
            v-if="!isCurrentMonth"
            @click="goToCurrentMonth"
            class="text-xs text-violet-600 dark:text-violet-400 hover:underline mt-1 font-medium"
          >
            Jump to current month
          </button>
        </div>
        <UiButton
          :disabled="!canGoNext"
          :class="{
            'opacity-40 cursor-not-allowed pointer-events-none': !canGoNext,
          }"
          @click="nextMonth"
        >
          <span class="hidden sm:inline">Next</span>
          <span class="text-xl">→</span>
        </UiButton>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="p-4 rounded-lg bg-stone-50 dark:bg-stone-800/50">
          <p
            class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-1"
          >
            Total Spent
          </p>
          <p
            class="text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums"
          >
            {{ formatMoney(selectedMonthStats.totalSpent) }}
          </p>
        </div>
        <div class="p-4 rounded-lg bg-stone-50 dark:bg-stone-800/50">
          <p
            class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-1"
          >
            Transactions
          </p>
          <p
            class="text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums"
          >
            {{ selectedMonthStats.count }}
          </p>
        </div>
        <div class="p-4 rounded-lg bg-stone-50 dark:bg-stone-800/50">
          <p
            class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-1"
          >
            Avg Amount
          </p>
          <p
            class="text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums"
          >
            {{ formatMoney(selectedMonthStats.avgTicket) }}
          </p>
        </div>
        <div class="p-4 rounded-lg bg-stone-50 dark:bg-stone-800/50">
          <p
            class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-1"
          >
            Income
          </p>
          <p
            class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums"
          >
            +{{ formatMoney(selectedMonthStats.income) }}
          </p>
        </div>
      </div>
    </UiCard>

    <!-- Filters -->
    <UiCard v-if="showFilters">
      <div class="grid md:grid-cols-3 gap-4">
        <div>
          <label
            class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2 block"
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
            class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2 block"
          >
            Transaction Type
          </label>
          <UiSelect
            v-model="filterType"
            :options="typeOptions"
            placeholder="All transactions"
          />
        </div>
        <div v-if="accounts.length > 0">
          <label
            class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2 block"
          >
            Account
          </label>
          <UiSelect
            v-model="filterAccount"
            :options="accountFilterOptions"
            placeholder="All accounts"
          />
        </div>
      </div>
    </UiCard>

    <!-- Transactions List -->
    <div class="flex items-center justify-between mb-3">
      <p class="text-sm text-stone-500 dark:text-stone-400">
        <template v-if="isSearchMode">
          {{ selectedMonthTransactions.length }}
          {{
            selectedMonthTransactions.length === 1
              ? 'result'
              : 'results'
          }}
          across all months
        </template>
        <template v-else>
          {{ selectedMonthTransactions.length }}
          {{
            selectedMonthTransactions.length === 1
              ? 'transaction'
              : 'transactions'
          }}
        </template>
      </p>
      <UiButton variant="ghost" size="sm" @click="showFilters = !showFilters">
        {{ showFilters ? 'Hide' : 'Show' }} filters
      </UiButton>
    </div>

    <UiCard padding="p-0" class="overflow-hidden">
      <div class="divide-y divide-stone-200 dark:divide-stone-800">
        <article
          v-for="transaction in selectedMonthTransactions"
          :key="transaction.id"
          class="p-4 flex items-start gap-4 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
        >
          <TransactionLogo
            :name="getFirstLine(transaction.description)"
            :fallback="CATEGORIES[transaction.category]?.icon"
            size="md"
            class="mt-1"
          />
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p
                class="font-medium truncate text-stone-900 dark:text-stone-100"
                :title="transaction.description"
              >
                {{ getFirstLine(transaction.description) }}
              </p>
              <span
                v-if="isRecurring(transaction)"
                class="text-[10px] bg-violet-100 dark:bg-violet-400/10 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded font-medium uppercase tracking-wide"
                >Recurring</span
              >
              <span
                v-if="transaction.isTransfer"
                class="text-[10px] bg-sky-100 dark:bg-sky-400/10 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded font-medium uppercase tracking-wide"
                >Transfer</span
              >
              <span
                v-if="getAccount(transaction.accountId)"
                class="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide"
                :style="{
                  backgroundColor:
                    getAccount(transaction.accountId)!.color + '22',
                  color: getAccount(transaction.accountId)!.color,
                }"
              >
                {{ getAccount(transaction.accountId)!.name }}
              </span>
            </div>
            <p class="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {{ formatDate(transaction.date) }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <UiSelect
                :model-value="transaction.category"
                :options="categoryOptions"
                size="sm"
                @update:modelValue="
                  (value) => updateCategory(transaction.id, value as Category)
                "
              />
              <UiButton
                variant="ghost"
                size="sm"
                class="text-rose-500 hover:text-rose-600"
                @click="deleteTransaction(transaction.id)"
              >
                Delete
              </UiButton>
            </div>
          </div>
          <p
            :class="
              transaction.amount > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-500'
            "
            class="font-semibold tabular-nums shrink-0"
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
        <p class="text-stone-500 dark:text-stone-400">
          <template v-if="isSearchMode">
            No transactions found matching "{{ searchQuery }}".
          </template>
          <template v-else>
            No transactions found for {{ selectedMonthLabel }}.
          </template>
        </p>
      </UiCard>
    </div>

    <!-- Add Transaction Button -->
    <button
      class="fixed bottom-28 right-6 md:bottom-8 md:right-10 h-14 w-14 rounded-full bg-violet-600 text-white flex items-center justify-center text-2xl hover:bg-violet-700 transition-all shadow-lg hover:shadow-xl"
      @click="showAddTransaction = true"
      aria-label="Add transaction"
    >
      +
    </button>

    <!-- Add Transaction Modal -->
    <Teleport to="body" v-if="showAddTransaction">
      <div
        class="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
      >
        <div
          class="bg-white dark:bg-stone-900 rounded-lg w-full max-w-lg p-6 space-y-4 border border-stone-200 dark:border-stone-800"
          @click.stop
        >
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold text-stone-900 dark:text-stone-100">
              Add Transaction
            </h2>
            <button
              @click="showAddTransaction = false"
              class="text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 text-2xl leading-none"
            >
              ✕
            </button>
          </div>

          <AddTransactionForm @close="handleAddClose" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns';
import { CATEGORIES, type Category } from '~/utils/categories';
import type { Transaction } from '~/types';

const showAddTransaction = ref(false);

const {
  transactionVersion,
  updateTransactionCategory,
  deleteTransaction: deleteTxn,
  getOldestTransactionDate,
  searchTransactions,
} = useTransactions();

const { recurringPayments } = useRecurring();

const { accounts, getAccount } = useAccounts();

const { formatCurrency } = useCurrency();

const getFirstLine = (text: string) => text.split('\n')[0] || text;

const showFilters = ref(false);
const filterCategory = ref('');
const filterType = ref('');
const filterAccount = ref('');

// Cross-month search
const searchQuery = ref('');
const searchResults = ref<Transaction[]>([]);
const isSearchMode = computed(() => searchQuery.value.trim().length > 0);

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, (query) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    searchResults.value = await searchTransactions(query);
  }, 200);
});

const accountFilterOptions = computed(() => [
  { label: 'All accounts', value: '' },
  ...accounts.value.map((a) => ({ label: a.name, value: a.id })),
]);

// Month navigation
const selectedMonth = ref(new Date());

const selectedMonthKey = computed(() => format(selectedMonth.value, 'yyyy-MM'));

const selectedMonthLabel = computed(() =>
  format(selectedMonth.value, 'MMMM yyyy'),
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

// Oldest transaction month, fetched via the indexed `date` query instead of
// sorting the whole in-memory array. Refreshed whenever the transaction
// count changes (add/delete/import may shift what the oldest month is).
const oldestMonth = ref<string | null>(null);
const refreshOldestMonth = async () => {
  const oldest = await getOldestTransactionDate();
  oldestMonth.value = oldest ? format(oldest, 'yyyy-MM') : null;
};
watch(transactionVersion, refreshOldestMonth, { immediate: true });

// Check if we can navigate
const canGoPrevious = computed(() => {
  if (!oldestMonth.value) return false;
  return selectedMonthKey.value > oldestMonth.value;
});

const canGoNext = computed(() => {
  const now = new Date();
  const currentMonth = format(now, 'yyyy-MM');
  return selectedMonthKey.value < currentMonth;
});

const recurringTransactionIds = computed(
  () => new Set(recurringPayments.value.flatMap((p) => p.transactionIds)),
);

const isRecurring = (transaction: { id: string }) =>
  recurringTransactionIds.value.has(transaction.id);

const categories = Object.keys(CATEGORIES);

const categoryOptions = computed(() =>
  categories.map((cat) => ({
    label: capitalize(cat),
    value: cat,
  })),
);

const typeOptions = [
  { label: 'All transactions', value: '' },
  { label: 'Recurring only', value: 'recurring' },
  { label: 'Variable only', value: 'variable' },
];

// Load only the selected month's transactions from the indexed `date` field
// - navigating months never has to scan or render the full history.
const { monthTransactions, refresh: refreshMonthTransactions } =
  useTransactionsByMonth(selectedMonth);

// Get transactions for selected month (or search results across all months)
const selectedMonthTransactions = computed(() => {
  let filtered = isSearchMode.value
    ? searchResults.value
    : monthTransactions.value;

  if (filterCategory.value) {
    filtered = filtered.filter((t) => t.category === filterCategory.value);
  }

  if (filterType.value === 'recurring') {
    filtered = filtered.filter((t) => isRecurring(t));
  } else if (filterType.value === 'variable') {
    filtered = filtered.filter((t) => !isRecurring(t));
  }

  if (filterAccount.value) {
    filtered = filtered.filter((t) => t.accountId === filterAccount.value);
  }

  return [...filtered].sort((a, b) => b.date.getTime() - a.date.getTime());
});

// Calculate stats for selected month
const selectedMonthStats = computed(() => {
  const expenses = monthTransactions.value.filter((t) => t.amount < 0);
  const income = monthTransactions.value.filter((t) => t.amount > 0);

  const totalSpent = Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0));
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

  return {
    count: monthTransactions.value.length,
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
  const item = monthTransactions.value.find((t) => t.id === id);
  if (item) item.category = category as Category;
};

const deleteTransaction = (id: string) => {
  if (confirm('Delete this transaction?')) {
    deleteTxn(id);
    monthTransactions.value = monthTransactions.value.filter(
      (t) => t.id !== id,
    );
  }
};

const handleAddClose = () => {
  showAddTransaction.value = false;
  refreshMonthTransactions();
};

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);
</script>
