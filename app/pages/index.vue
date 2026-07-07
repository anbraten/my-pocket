<template>
  <div class="space-y-6">
    <!-- Budget Estimate Section -->
    <UiCard padding="p-8">
      <!-- Header -->
      <div class="mb-6">
        <p
          class="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2"
        >
          Remaining Budget This Month
        </p>
        <h1
          class="text-6xl font-bold mb-3 tabular-nums"
          :class="
            budgetStatus === 'over'
              ? 'text-rose-500'
              : 'text-stone-900 dark:text-stone-100'
          "
        >
          {{ formatMoney(remainingThisMonth) }}
        </h1>
        <div
          class="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400"
        >
          <span
            >Day {{ monthProgress.daysElapsed }}/{{
              monthProgress.daysTotal
            }}</span
          >
          <span>·</span>
          <span class="font-medium">{{ budgetPaceMessage }}</span>
        </div>
      </div>

      <!-- Budget Progress Bar -->
      <div class="mb-7">
        <div
          class="flex items-center justify-between text-xs mb-2 text-stone-500 dark:text-stone-400"
        >
          <span>Budget Usage</span>
          <span>{{ Math.round(budgetUsagePercent) }}%</span>
        </div>
        <div
          class="h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden flex"
        >
          <div
            class="bg-violet-500"
            :style="{ width: `${fixedCostsPercent}%` }"
            :title="`Fixed: ${formatMoney(recurringBurn)}`"
          />
          <div
            class="bg-violet-300"
            :style="{ width: `${discretionaryPercent}%` }"
            :title="`Variable: ${formatMoney(discretionarySpent)}`"
          />
        </div>
        <div
          class="flex items-center gap-5 text-xs mt-2 text-stone-500 dark:text-stone-400"
        >
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-violet-500" />
            <span>Fixed {{ Math.round(fixedCostsPercent) }}%</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-violet-300" />
            <span>Variable {{ Math.round(discretionaryPercent) }}%</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-700" />
            <span
              >Left
              {{ Math.round(Math.max(0, 100 - budgetUsagePercent)) }}%</span
            >
          </div>
        </div>
      </div>

      <!-- Budget Breakdown -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-stone-50 dark:bg-stone-800/60 rounded-lg p-4">
          <p
            class="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1"
          >
            Expected Income
          </p>
          <p
            class="text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums"
          >
            +{{ formatMoney(baseIncome) }}
          </p>
        </div>
        <div class="bg-stone-50 dark:bg-stone-800/60 rounded-lg p-4">
          <p
            class="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1"
          >
            Fixed Costs
          </p>
          <p
            class="text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums"
          >
            {{ formatMoney(recurringBurn) }}
          </p>
          <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Monthly recurring
          </p>
        </div>
        <div class="bg-stone-50 dark:bg-stone-800/60 rounded-lg p-4">
          <p
            class="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1"
          >
            Variable
          </p>
          <p
            class="text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums"
          >
            {{ formatMoney(discretionarySpent) }}
          </p>
          <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Non-recurring
          </p>
        </div>
        <div class="bg-stone-50 dark:bg-stone-800/60 rounded-lg p-4">
          <p
            class="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1"
          >
            Savings Goal
          </p>
          <p
            class="text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums"
          >
            {{ formatMoney(targetSavings) }}
          </p>
          <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            20% of income
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="mt-6 pt-5 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between"
      >
        <span class="text-sm text-stone-500 dark:text-stone-400">
          {{
            remainingThisMonth > 0
              ? `${formatMoney(remainingThisMonth / (monthProgress.daysTotal - monthProgress.daysElapsed + 1))} per day left`
              : 'Over budget — reduce spending'
          }}
        </span>
        <span
          class="text-xs font-medium px-2.5 py-1 rounded-full"
          :class="
            budgetStatus === 'over'
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
              : 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400'
          "
        >
          {{ budgetStatus === 'over' ? 'Over budget' : 'On track' }}
        </span>
      </div>
    </UiCard>

    <!-- Spending Breakdown Section -->
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- All Spending by Category -->
      <UiCard>
        <div class="flex items-center justify-between mb-4">
          <div>
            <p
              class="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider"
            >
              Monthly Spending
            </p>
            <h3
              class="text-xl font-bold text-stone-900 dark:text-stone-100 mt-1"
            >
              {{ formatMoney(monthlyExpenseTotal) }}
              <span
                class="text-sm font-normal text-stone-500 dark:text-stone-400"
                >total</span
              >
            </h3>
          </div>
          <NuxtLink
            to="/transactions"
            class="text-xs text-violet-600 dark:text-violet-400 hover:underline"
          >
            View all →
          </NuxtLink>
        </div>

        <div class="space-y-1">
          <article
            v-for="item in allSpendingByCategory"
            :key="item.category"
            class="flex items-center justify-between py-2.5"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <span class="text-xl leading-none">{{
                CATEGORIES[item.category]?.icon
              }}</span>
              <div class="flex-1 min-w-0">
                <p
                  class="font-medium text-stone-900 dark:text-stone-100 text-sm capitalize"
                >
                  {{ item.category }}
                </p>
                <p class="text-xs text-stone-500 dark:text-stone-400">
                  {{ item.count }}
                  {{ item.count === 1 ? 'transaction' : 'transactions' }}
                </p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-semibold text-rose-500 tabular-nums">
                  -{{ formatMoney(item.total) }}
                </p>
                <p class="text-xs text-stone-500 dark:text-stone-400">
                  {{ Math.round(item.percentage) }}%
                </p>
              </div>
            </div>
          </article>

          <div
            v-if="allSpendingByCategory.length === 0"
            class="text-center py-8 text-stone-500 dark:text-stone-400"
          >
            No spending yet this month
          </div>
        </div>
      </UiCard>

      <!-- Fixed Costs -->
      <UiCard>
        <div class="mb-4">
          <p
            class="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider"
          >
            Fixed Monthly Costs
          </p>
          <h3
            class="text-xl font-bold text-stone-900 dark:text-stone-100 mt-1 tabular-nums"
          >
            {{ formatMoney(recurringBurn) }}
          </h3>
        </div>

        <div class="space-y-1">
          <article
            v-for="payment in recurringExpenses.slice(0, 6)"
            :key="payment.merchant"
            class="flex items-center justify-between py-2.5"
          >
            <div class="flex items-center gap-2 min-w-0">
              <TransactionLogo
                :name="payment.merchant"
                :fallback="CATEGORIES[payment.category]?.icon"
                size="sm"
              />
              <span class="text-sm truncate text-stone-900 dark:text-stone-100">
                {{ payment.merchant }}
              </span>
            </div>
            <span
              class="text-sm font-medium text-stone-600 dark:text-stone-300 tabular-nums shrink-0 ml-3"
            >
              {{ formatMoney(normalizeRecurring(payment)) }}
            </span>
          </article>

          <NuxtLink
            v-if="recurringExpenses.length > 6"
            to="/recurring"
            class="block text-xs text-violet-600 dark:text-violet-400 hover:underline pt-2"
          >
            View all {{ recurringExpenses.length }} recurring expenses →
          </NuxtLink>
        </div>
      </UiCard>
    </div>

    <!-- Accounts Overview -->
    <UiCard v-if="accountSummaries.length > 0">
      <div class="mb-4">
        <p
          class="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider"
        >
          Accounts
        </p>
        <h3
          class="text-xl font-bold text-stone-900 dark:text-stone-100 mt-1 tabular-nums"
        >
          {{ formatMoney(netWorth) }}
          <span class="text-sm font-normal text-stone-500 dark:text-stone-400"
            >net flow</span
          >
        </h3>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="summary in accountSummaries"
          :key="summary.account.id"
          class="rounded-lg border border-stone-200 dark:border-stone-700 p-3 space-y-1"
        >
          <div class="flex items-center gap-2">
            <span
              class="h-2.5 w-2.5 rounded-full shrink-0"
              :style="{ backgroundColor: summary.account.color }"
            />
            <p
              class="text-sm font-medium text-stone-900 dark:text-stone-100 truncate"
            >
              {{ summary.account.name }}
            </p>
            <span
              class="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 uppercase tracking-wide shrink-0"
            >
              {{ summary.account.type }}
            </span>
          </div>
          <p
            class="text-lg font-bold tabular-nums"
            :class="
              summary.net >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-stone-900 dark:text-stone-100'
            "
          >
            {{ formatMoney(summary.net) }}
          </p>
          <p class="text-xs text-stone-500 dark:text-stone-400">
            {{ summary.count }} transactions
          </p>
        </div>
      </div>
    </UiCard>

    <!-- Insights & Reports Section -->
    <FinancialInsights
      :month-progress="monthProgress"
      :discretionary-spent="discretionarySpent"
      :base-income="baseIncome"
      :recurring-burn="recurringBurn"
      :target-savings="targetSavings"
      :monthly-expenses="monthlyExpenses"
      :prev-month-expenses="prevMonthTransactions.filter((t) => t.amount < 0)"
    />
  </div>
</template>

<script setup lang="ts">
import { CATEGORIES, type Category } from '~/utils/categories';
import type { RecurringPayment } from '~/types';
import { db } from '~/utils/db';

const { transactionVersion } = useTransactions();
const { recurringPayments } = useRecurring();
const { accounts } = useAccounts();

// Current month
const currentMonth = ref(new Date());
const { monthTransactions } = useTransactionsByMonth(currentMonth);
const monthlyExpenses = computed(() =>
  monthTransactions.value.filter((t) => t.amount < 0 && !t.isTransfer),
);
const monthlyIncome = computed(() =>
  monthTransactions.value.filter((t) => t.amount > 0 && !t.isTransfer),
);

// Previous month — needed for spending trend comparisons
const previousMonth = computed(() => {
  const d = new Date(currentMonth.value);
  d.setMonth(d.getMonth() - 1);
  return d;
});
const { monthTransactions: prevMonthTransactions } =
  useTransactionsByMonth(previousMonth);

// Account summaries — queried from DB, refreshed when transaction data changes
const accountSummaries = ref<
  { account: (typeof accounts.value)[0]; net: number; count: number }[]
>([]);

const loadAccountSummaries = async () => {
  if (!import.meta.client || accounts.value.length === 0) return;
  const results = await Promise.all(
    accounts.value.map(async (account) => {
      const txs = await db.transactions
        .where('accountId')
        .equals(account.id)
        .toArray();
      const net = txs.reduce((sum, t) => sum + t.amount, 0);
      return { account, net, count: txs.length };
    }),
  );
  accountSummaries.value = results.filter((s) => s.count > 0);
};

watch([accounts, transactionVersion], loadAccountSummaries, {
  immediate: true,
});

const netWorth = computed(() =>
  accountSummaries.value.reduce((sum, s) => sum + s.net, 0),
);

const { monthProgress, analyzeRecurring } = useFinancialAnalysis(
  monthlyExpenses,
  monthlyIncome,
);

const { formatCurrency } = useCurrency();

const monthlyExpenseTotal = computed(() =>
  Math.abs(monthlyExpenses.value.reduce((sum, t) => sum + t.amount, 0)),
);

const monthlyIncomeTotal = computed(() =>
  monthlyIncome.value.reduce((sum, t) => sum + t.amount, 0),
);

const recurringAnalysis = computed(() => analyzeRecurring.value);

const recurringExpenses = computed(() =>
  recurringPayments.value
    .filter((p) => p.amount < 0)
    .toSorted((a, b) => normalizeRecurring(b) - normalizeRecurring(a)),
);

const normalizeRecurring = (payment: RecurringPayment) => {
  const monthlyAmount = (() => {
    if (payment.frequency === 'weekly') return (payment.amount * 52) / 12;
    if (payment.frequency === 'yearly') return payment.amount / 12;
    return payment.amount;
  })();

  return Math.abs(monthlyAmount);
};

const recurringBurn = computed(() => recurringAnalysis.value.totalMonthly);

// Use recurring income if available, otherwise use actual monthly income
const recurringIncomeAmount = computed(
  () => recurringAnalysis.value.recurringIncome,
);

const baseIncome = computed(() => {
  // If we have recurring income detected, use that
  // Otherwise fall back to actual monthly income
  return recurringIncomeAmount.value > 0
    ? recurringIncomeAmount.value
    : monthlyIncomeTotal.value;
});

// Calculate target savings (20% of income)
const targetSavings = computed(() => {
  return baseIncome.value * 0;
});

// Calculate discretionary spending (non-recurring expenses this month)
const discretionarySpent = computed(() => {
  // Get all recurring merchant names (normalized for fuzzy matching)
  const recurringMerchants = new Set(
    recurringExpenses.value.map((p) => p.merchant.toLowerCase().trim()),
  );

  // Filter out transactions that match recurring merchants
  const nonRecurringExpenses = monthlyExpenses.value.filter((t) => {
    const merchant = (t.description.split('\n')[0] ?? '').toLowerCase().trim();
    // Check if this merchant is in our recurring list (fuzzy match would be more accurate but this is simpler)
    return !Array.from(recurringMerchants).some(
      (rm) => merchant.includes(rm) || rm.includes(merchant),
    );
  });

  return Math.abs(nonRecurringExpenses.reduce((sum, t) => sum + t.amount, 0));
});

// Calculate what's left this month
const remainingThisMonth = computed(() => {
  return (
    baseIncome.value -
    recurringBurn.value -
    targetSavings.value -
    discretionarySpent.value
  );
});

// Budget status for color coding
const budgetStatus = computed((): 'good' | 'over' => {
  // Ensure all values are loaded before determining status
  if (!baseIncome.value && !monthlyIncomeTotal.value) return 'good';
  return remainingThisMonth.value <= 0 ? 'over' : 'good';
});

// Budget usage percentages for the bar
const totalBudget = computed(() => {
  const budget = baseIncome.value - targetSavings.value;
  return budget > 0 ? budget : 1; // Prevent division by zero
});

const fixedCostsPercent = computed(() => {
  if (totalBudget.value <= 1) return 0;
  return Math.min(100, (recurringBurn.value / totalBudget.value) * 100);
});

const discretionaryPercent = computed(() => {
  if (totalBudget.value <= 1) return 0;
  return Math.min(
    100 - fixedCostsPercent.value,
    (discretionarySpent.value / totalBudget.value) * 100,
  );
});

const budgetUsagePercent = computed(() => {
  if (totalBudget.value <= 1) return 0;
  return Math.min(
    100,
    ((recurringBurn.value + discretionarySpent.value) / totalBudget.value) *
      100,
  );
});

// Budget pacing message
const budgetPaceMessage = computed(() => {
  const progress = monthProgress.value;
  const percentElapsed = progress.percentElapsed;
  const expectedToSpend =
    (baseIncome.value - recurringBurn.value - targetSavings.value) *
    percentElapsed;

  if (discretionarySpent.value > expectedToSpend * 1.2) {
    return 'Spending faster than planned';
  } else if (discretionarySpent.value < expectedToSpend * 0.8) {
    return 'Under budget, great job!';
  }
  return 'On track';
});

// Group all spending by category (including recurring)
const allSpendingByCategory = computed(() => {
  const categoryTotals: Record<Category, { total: number; count: number }> =
    {} as Record<Category, { total: number; count: number }>;

  // Add all monthly expenses
  monthlyExpenses.value.forEach((transaction) => {
    if (!categoryTotals[transaction.category]) {
      categoryTotals[transaction.category] = {
        total: 0,
        count: 0,
      };
    }
    categoryTotals[transaction.category].total += Math.abs(transaction.amount);
    categoryTotals[transaction.category].count += 1;
  });

  const total = monthlyExpenseTotal.value;

  return Object.entries(categoryTotals)
    .map(([category, data]) => ({
      category: category as Category,
      total: data.total,
      count: data.count,
      percentage: total > 0 ? (data.total / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
});

const formatMoney = (value: number, options?: Intl.NumberFormatOptions) =>
  formatCurrency(value, {
    maximumFractionDigits: 0,
    ...options,
  });
</script>
