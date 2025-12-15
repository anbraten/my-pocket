<template>
  <div class="space-y-6">
    <!-- Budget Estimate Section -->
    <UiCard
      :class="[
        budgetStatus === 'over'
          ? '!bg-gradient-to-br !from-rose-500 !to-red-600 !border-rose-500'
          : '!bg-gradient-to-br !from-indigo-500 !to-purple-600 !border-indigo-500',
        'text-white',
      ]"
      padding="p-8"
    >
      <!-- Header -->
      <div class="mb-8">
        <p class="text-xs uppercase tracking-wider opacity-70 mb-3">
          Remaining Budget This Month
        </p>
        <h1 class="text-6xl font-bold mb-3">
          {{ formatMoney(remainingThisMonth) }}
        </h1>
        <div class="flex items-center gap-3 text-sm opacity-90">
          <span
            >Day {{ monthProgress.daysElapsed }}/{{
              monthProgress.daysTotal
            }}</span
          >
          <span>•</span>
          <span class="font-medium">{{ budgetPaceMessage }}</span>
        </div>
      </div>

      <!-- Budget Progress Bar -->
      <div class="mb-8">
        <div
          class="flex items-center justify-between text-xs mb-3 opacity-80 font-medium"
        >
          <span>Budget Usage</span>
          <span>{{ Math.round(budgetUsagePercent) }}%</span>
        </div>
        <div
          class="h-5 bg-black/20 rounded-full overflow-hidden flex shadow-inner"
        >
          <div
            class="bg-amber-400"
            :style="{ width: `${fixedCostsPercent}%` }"
            :title="`Fixed: ${formatMoney(recurringBurn)}`"
          ></div>
          <div
            class="bg-yellow-300"
            :style="{ width: `${discretionaryPercent}%` }"
            :title="`Variable: ${formatMoney(discretionarySpent)}`"
          ></div>
        </div>
        <div class="flex items-center gap-6 text-xs mt-3 opacity-90">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-sm bg-amber-400"></div>
            <span>Fixed {{ Math.round(fixedCostsPercent) }}%</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-sm bg-yellow-300"></div>
            <span>Variable {{ Math.round(discretionaryPercent) }}%</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-sm bg-white/30"></div>
            <span
              >Left
              {{ Math.round(Math.max(0, 100 - budgetUsagePercent)) }}%</span
            >
          </div>
        </div>
      </div>

      <!-- Budget Breakdown -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div class="bg-white/10 rounded-lg p-4">
          <p class="text-[10px] uppercase tracking-wider opacity-70 mb-2">
            Expected Income
          </p>
          <p class="text-2xl font-bold mb-1">+{{ formatMoney(baseIncome) }}</p>
          <p v-if="recurringIncomeAmount > 0" class="text-xs opacity-70">
            {{ monthlyIncomeTotal > 0 ? 'Recurring' : 'Estimated' }}
          </p>
        </div>
        <div class="bg-amber-400/20 rounded-lg p-4 border border-amber-400/30">
          <p class="text-[10px] uppercase tracking-wider opacity-70 mb-2">
            Fixed Costs
          </p>
          <p class="text-2xl font-bold mb-1 text-amber-300">
            {{ formatMoney(recurringBurn) }}
          </p>
          <p class="text-xs opacity-70">Monthly recurring</p>
        </div>
        <div
          class="bg-yellow-300/20 rounded-lg p-4 border border-yellow-300/30"
        >
          <p class="text-[10px] uppercase tracking-wider opacity-70 mb-2">
            Variable
          </p>
          <p class="text-2xl font-bold mb-1 text-yellow-200">
            {{ formatMoney(discretionarySpent) }}
          </p>
          <p class="text-xs opacity-70">Non-recurring</p>
        </div>
        <div class="bg-white/10 rounded-lg p-4">
          <p class="text-[10px] uppercase tracking-wider opacity-70 mb-2">
            Savings Goal
          </p>
          <p class="text-2xl font-bold mb-1">
            {{ formatMoney(targetSavings) }}
          </p>
          <p class="text-xs opacity-70">20% of income</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-6 pt-6 border-t border-white/20">
        <div class="flex items-center justify-between">
          <span class="text-sm opacity-90">
            {{
              remainingThisMonth > 0
                ? `${formatMoney(
                    remainingThisMonth /
                      (monthProgress.daysTotal - monthProgress.daysElapsed + 1)
                  )} per day for rest of month`
                : 'Over budget - reduce spending'
            }}
          </span>
          <span class="text-sm font-bold px-3 py-1.5 rounded-full bg-white/20">
            {{ budgetStatus === 'over' ? '🚨 Over budget' : '✅ On track' }}
          </span>
        </div>
      </div>
    </UiCard>

    <!-- Spending Breakdown Section -->
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- All Spending by Category -->
      <UiCard>
        <div class="flex items-center justify-between mb-4">
          <div>
            <p
              class="text-xs text-neutral-600 dark:text-neutral-400 uppercase tracking-wider"
            >
              Monthly Spending
            </p>
            <h3 class="text-xl font-bold text-black dark:text-white mt-1">
              {{ formatMoney(monthlyExpenseTotal) }}
              <span
                class="text-sm font-normal text-neutral-600 dark:text-neutral-400"
              >
                total
              </span>
            </h3>
          </div>
          <NuxtLink
            to="/transactions"
            class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            View all →
          </NuxtLink>
        </div>

        <div class="space-y-3">
          <article
            v-for="item in allSpendingByCategory"
            :key="item.category"
            class="flex items-center justify-between py-2"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <span class="text-2xl">{{ CATEGORY_ICONS[item.category] }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p
                    class="font-medium text-black dark:text-white text-sm capitalize"
                  >
                    {{ item.category }}
                  </p>
                  <span
                    v-if="item.hasRecurring"
                    class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 uppercase font-medium"
                  >
                    Fixed
                  </span>
                </div>
                <p class="text-xs text-neutral-600 dark:text-neutral-400">
                  {{ item.count }}
                  {{ item.count === 1 ? 'transaction' : 'transactions' }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-sm font-semibold text-rose-500">
                  -{{ formatMoney(item.total) }}
                </p>
                <p class="text-xs text-neutral-600 dark:text-neutral-400">
                  {{ Math.round(item.percentage) }}%
                </p>
              </div>
            </div>
          </article>

          <div
            v-if="allSpendingByCategory.length === 0"
            class="text-center py-8 text-neutral-600 dark:text-neutral-400"
          >
            No spending yet this month ✨
          </div>
        </div>
      </UiCard>

      <!-- Fixed Costs -->
      <UiCard>
        <div class="mb-4">
          <p
            class="text-xs text-neutral-600 dark:text-neutral-400 uppercase tracking-wider"
          >
            Fixed Monthly Costs
          </p>
          <h3 class="text-xl font-bold text-black dark:text-white mt-1">
            {{ formatMoney(recurringBurn) }}
          </h3>
        </div>

        <div class="space-y-2">
          <article
            v-for="payment in recurringExpenses.slice(0, 6)"
            :key="payment.merchant"
            class="flex items-center justify-between py-2"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-lg">{{
                CATEGORY_ICONS[payment.category]
              }}</span>
              <span class="text-sm truncate text-black dark:text-white">
                {{ payment.merchant }}
              </span>
            </div>
            <span
              class="text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              {{ formatMoney(normalizeRecurring(payment)) }}
            </span>
          </article>

          <NuxtLink
            v-if="recurringExpenses.length > 6"
            to="/recurring"
            class="block text-xs text-indigo-600 dark:text-indigo-400 hover:underline pt-2"
          >
            View all {{ recurringExpenses.length }} recurring expenses →
          </NuxtLink>
        </div>
      </UiCard>
    </div>

    <!-- Insights & Reports Section -->
    <UiCard>
      <div class="mb-4">
        <h2 class="text-xl font-bold text-black dark:text-white">
          💡 Financial Insights
        </h2>
        <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
          AI-powered analysis of your spending patterns
        </p>
      </div>

      <div class="space-y-3">
        <article
          v-for="insight in allInsights"
          :key="insight.id"
          class="p-4 rounded-lg border transition-all"
          :class="{
            'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950':
              insight.severity === 'success',
            'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950':
              insight.severity === 'info',
            'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950':
              insight.severity === 'warning',
            'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950':
              insight.severity === 'danger',
          }"
        >
          <p
            class="text-xs uppercase font-medium tracking-wider mb-1"
            :class="{
              'text-emerald-600 dark:text-emerald-400':
                insight.severity === 'success',
              'text-blue-600 dark:text-blue-400': insight.severity === 'info',
              'text-amber-600 dark:text-amber-400':
                insight.severity === 'warning',
              'text-rose-600 dark:text-rose-400': insight.severity === 'danger',
            }"
          >
            {{ insight.type }}
          </p>
          <p class="font-bold text-base text-black dark:text-white">
            {{ insight.title }}
          </p>
          <p class="text-sm text-neutral-700 dark:text-neutral-300 mt-1">
            {{ insight.description }}
          </p>
        </article>

        <div
          v-if="allInsights.length === 0"
          class="text-center py-8 text-neutral-600 dark:text-neutral-400"
        >
          <p class="text-3xl mb-2">✨</p>
          <p>Add more transactions to get personalized insights</p>
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { CATEGORY_ICONS } from '~/utils/categories';
import {
  detectAnomalies,
  analyzeSpendingTrends,
  analyzeBudgetPacing,
  type InsightMessage,
} from '~/utils/insights';
import type { Category, RecurringPayment } from '~/types';

const {
  transactions,
  monthlyExpenses,
  monthlyIncome,
  detectRecurringPayments,
} = useTransactions();

const { monthProgress, analyzeRecurring } = useFinancialAnalysis();

const { formatCurrency } = useCurrency();

const monthlyExpenseTotal = computed(() =>
  Math.abs(monthlyExpenses.value.reduce((sum, t) => sum + t.amount, 0))
);

const monthlyIncomeTotal = computed(() =>
  monthlyIncome.value.reduce((sum, t) => sum + t.amount, 0)
);

const recurringAnalysis = computed(() => analyzeRecurring.value);

const recurringExpenses = computed(() =>
  detectRecurringPayments()
    .filter((p) => p.amount < 0)
    .toSorted((a, b) => normalizeRecurring(b) - normalizeRecurring(a))
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
  () => recurringAnalysis.value.recurringIncome
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
    recurringExpenses.value.map((p) => p.merchant.toLowerCase().trim())
  );

  // Filter out transactions that match recurring merchants
  const nonRecurringExpenses = monthlyExpenses.value.filter((t) => {
    const merchant = (t.merchant ?? t.description.split(' ')[0] ?? '')
      .toLowerCase()
      .trim();
    // Check if this merchant is in our recurring list (fuzzy match would be more accurate but this is simpler)
    return !Array.from(recurringMerchants).some(
      (rm) => merchant.includes(rm) || rm.includes(merchant)
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
    (discretionarySpent.value / totalBudget.value) * 100
  );
});

const budgetUsagePercent = computed(() => {
  if (totalBudget.value <= 1) return 0;
  return Math.min(
    100,
    ((recurringBurn.value + discretionarySpent.value) / totalBudget.value) * 100
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
  const categoryTotals: Record<
    Category,
    { total: number; count: number; hasRecurring: boolean }
  > = {} as Record<
    Category,
    { total: number; count: number; hasRecurring: boolean }
  >;

  // Add all monthly expenses
  monthlyExpenses.value.forEach((transaction) => {
    if (!categoryTotals[transaction.category]) {
      categoryTotals[transaction.category] = {
        total: 0,
        count: 0,
        hasRecurring: false,
      };
    }
    categoryTotals[transaction.category].total += Math.abs(transaction.amount);
    categoryTotals[transaction.category].count += 1;
  });

  // Mark categories that have recurring expenses
  recurringExpenses.value.forEach((payment) => {
    if (categoryTotals[payment.category]) {
      categoryTotals[payment.category].hasRecurring = true;
    }
  });

  const total = monthlyExpenseTotal.value;

  return Object.entries(categoryTotals)
    .map(([category, data]) => ({
      category: category as Category,
      total: data.total,
      count: data.count,
      hasRecurring: data.hasRecurring,
      percentage: total > 0 ? (data.total / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
});

// Generate all insights
const allInsights = computed((): InsightMessage[] => {
  const insights: InsightMessage[] = [];

  // Budget pacing insight
  const pacingInsight = analyzeBudgetPacing(
    monthProgress.value.daysElapsed,
    monthProgress.value.daysTotal,
    discretionarySpent.value,
    baseIncome.value - recurringBurn.value - targetSavings.value
  );
  if (pacingInsight) {
    insights.push(pacingInsight);
  }

  // Anomaly detection
  const anomalies = detectAnomalies(monthlyExpenses.value);
  insights.push(...anomalies);

  // Spending trends
  const trends = analyzeSpendingTrends(
    monthlyExpenses.value,
    transactions.value
  );
  insights.push(...trends);

  // Limit to top 5 insights
  return insights.slice(0, 5);
});

const formatMoney = (value: number, options?: Intl.NumberFormatOptions) =>
  formatCurrency(value, {
    maximumFractionDigits: 0,
    ...options,
  });
</script>
