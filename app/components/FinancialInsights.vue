<template>
  <UiCard>
    <div class="mb-5">
      <h2 class="text-lg font-semibold text-stone-900 dark:text-stone-100">
        Financial Insights
      </h2>
      <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
        Analysis of your spending patterns
      </p>
    </div>

    <div class="space-y-2">
      <article
        v-for="insight in insights"
        :key="insight.id"
        class="py-3 pl-4 border-l-2 transition-all"
        :class="{
          'border-emerald-500': insight.severity === 'success',
          'border-violet-500': insight.severity === 'info',
          'border-amber-500': insight.severity === 'warning',
          'border-rose-500': insight.severity === 'danger',
        }"
      >
        <p
          class="text-[10px] uppercase font-semibold tracking-wider mb-0.5"
          :class="{
            'text-emerald-600 dark:text-emerald-400':
              insight.severity === 'success',
            'text-violet-600 dark:text-violet-400': insight.severity === 'info',
            'text-amber-600 dark:text-amber-400':
              insight.severity === 'warning',
            'text-rose-600 dark:text-rose-400': insight.severity === 'danger',
          }"
        >
          {{ insight.type }}
        </p>
        <p class="font-semibold text-sm text-stone-900 dark:text-stone-100">
          {{ insight.title }}
        </p>
        <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          {{ insight.description }}
        </p>
      </article>

      <div
        v-if="insights.length === 0"
        class="text-center py-8 text-stone-500 dark:text-stone-400"
      >
        Add more transactions to get personalized insights
      </div>
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import {
  detectAnomalies,
  analyzeSpendingTrends,
  analyzeBudgetPacing,
  type InsightMessage,
} from '~/utils/insights';
import type { Transaction } from '~/types';

const props = defineProps<{
  monthProgress: { daysElapsed: number; daysTotal: number; percentElapsed: number };
  discretionarySpent: number;
  baseIncome: number;
  recurringBurn: number;
  targetSavings: number;
  monthlyExpenses: Transaction[];
  prevMonthExpenses: Transaction[];
}>();

const insights = computed((): InsightMessage[] => {
  const result: InsightMessage[] = [];

  const pacingInsight = analyzeBudgetPacing(
    props.monthProgress.daysElapsed,
    props.monthProgress.daysTotal,
    props.discretionarySpent,
    props.baseIncome - props.recurringBurn - props.targetSavings,
  );
  if (pacingInsight) result.push(pacingInsight);

  result.push(...detectAnomalies(props.monthlyExpenses));
  result.push(...analyzeSpendingTrends(props.monthlyExpenses, props.prevMonthExpenses));

  return result.slice(0, 5);
});
</script>
