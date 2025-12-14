<template>
  <div class="space-y-8">
    <section class="grid gap-4 md:grid-cols-3">
      <UiCard as="div" variant="frosted" padding="p-5" shadow>
        <p class="text-xs uppercase tracking-[0.3em] text-slate-300">
          Monthly budget
        </p>
        <h2 class="text-3xl font-semibold mt-2">
          {{ formatMoney(MONTHLY_BUDGET) }}
        </h2>
        <div class="mt-4">
          <div class="flex justify-between text-xs text-slate-300 mb-1">
            <span>Spent</span>
            <span>{{ formatMoney(monthlyExpenseTotal) }}</span>
          </div>
          <div class="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-cyan-400"
              :style="{ width: `${budgetUsage * 100}%` }"
            ></div>
          </div>
        </div>
        <p class="text-xs text-slate-400 mt-3">{{ budgetUsageLabel }}</p>
      </UiCard>

      <UiCard
        as="div"
        variant="bare"
        padding="p-5"
        shadow
        class="bg-gradient-to-br from-emerald-400 via-cyan-400 to-sky-500 text-slate-950"
      >
        <p class="text-xs uppercase tracking-[0.3em]">Projected savings</p>
        <h2 class="text-3xl font-semibold mt-2">
          {{ formatMoney(netCashFlow) }}
        </h2>
        <p class="text-sm text-slate-800/80 mt-2">{{ savingsCopy }}</p>
        <div class="mt-4 text-xs text-slate-900/70 flex justify-between">
          <span>Income</span>
          <strong>{{ formatMoney(monthlyIncomeTotal) }}</strong>
        </div>
      </UiCard>

      <UiCard
        as="div"
        padding="p-5"
        shadow
        class="bg-gradient-to-br from-rose-500/90 to-orange-500/90"
      >
        <p class="text-xs uppercase tracking-[0.3em] text-slate-300">
          Subscriptions
        </p>
        <h2 class="text-3xl font-semibold mt-2">
          {{ formatMoney(subscriptionBurn) }}/mo
        </h2>
        <p class="text-sm text-slate-400 mt-2">
          {{ recurringPayments.length }} active services
        </p>
        <ul class="mt-4 space-y-2 text-sm text-slate-300">
          <li
            v-for="payment in recurringPreview"
            :key="payment.merchant"
            class="flex justify-between"
          >
            <span class="truncate pr-2">{{ payment.merchant }}</span>
            <span>{{ formatMoney(normalizeSubscription(payment)) }}</span>
          </li>
        </ul>
      </UiCard>
    </section>

    <section class="grid gap-4 md:grid-cols-2">
      <UiCard class="border-white/5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-xs text-slate-400">Category budgets</p>
            <h3 class="text-xl font-semibold">Where your money goes</h3>
          </div>
          <span class="text-xs text-slate-500"
            >{{ categoryBudgetProgress.length }} tracked</span
          >
        </div>

        <div class="space-y-4">
          <div
            v-for="item in categoryBudgetProgress"
            :key="item.category"
            class="space-y-2"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xl">{{ CATEGORY_ICONS[item.category] }}</span>
                <div>
                  <p class="text-sm font-medium capitalize">
                    {{ item.category }}
                  </p>
                  <p class="text-xs text-slate-400">
                    {{ formatMoney(item.spent) }} /
                    {{ formatMoney(item.budget) }}
                  </p>
                </div>
              </div>
              <span class="text-xs text-slate-400"
                >{{ Math.round(item.percent) }}%</span
              >
            </div>
            <div class="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full"
                :style="{
                  width: `${item.percent}%`,
                  backgroundColor: CATEGORY_COLORS[item.category],
                }"
              ></div>
            </div>
          </div>
        </div>
      </UiCard>

      <UiCard class="border-white/5 space-y-4" padding="p-6">
        <div>
          <p class="text-xs text-slate-400">Advisor</p>
          <h3 class="text-xl font-semibold">What needs attention</h3>
        </div>
        <ul class="space-y-3">
          <li
            v-for="note in advisorNotes"
            :key="note.title"
            class="p-4 rounded-2xl border border-white/10 bg-white/5"
          >
            <p class="text-sm text-slate-300 uppercase tracking-[0.2em]">
              {{ note.tag }}
            </p>
            <p class="text-lg font-semibold mt-1">{{ note.title }}</p>
            <p class="text-sm text-slate-400 mt-1">{{ note.detail }}</p>
          </li>
          <li v-if="advisorNotes.length === 0" class="text-sm text-slate-400">
            Everything looks calm. Keep the momentum! ✨
          </li>
        </ul>
      </UiCard>
    </section>

    <UiCard as="section" class="border-white/5">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-xs text-slate-400">Recent activity</p>
          <h3 class="text-xl font-semibold">Latest transactions</h3>
        </div>
        <span class="text-xs text-slate-500"
          >{{ recentTransactions.length }} newest</span
        >
      </div>

      <div class="space-y-3">
        <article
          v-for="transaction in recentTransactions"
          :key="transaction.id"
          class="flex items-center justify-between py-3 border-b border-white/5 last:border-none"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span class="text-2xl">{{
              CATEGORY_ICONS[transaction.category]
            }}</span>
            <div class="min-w-0">
              <p class="font-medium truncate">
                {{ getFirstLine(transaction.description) }}
              </p>
              <p class="text-xs text-slate-500">
                {{ formatDate(transaction.date) }}
              </p>
            </div>
          </div>
          <div
            :class="
              transaction.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
            "
            class="text-sm font-semibold"
          >
            {{ formatSignedMoney(transaction.amount) }}
          </div>
        </article>

        <div
          v-if="recentTransactions.length === 0"
          class="text-center py-8 text-slate-500"
        >
          No recent transactions yet.
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { format, isToday } from 'date-fns';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '~/utils/categories';
import { CATEGORY_BUDGETS, MONTHLY_BUDGET } from '~/utils/budgets';
import type { Category, RecurringPayment } from '~/types';

const {
  transactions,
  monthlyExpenses,
  monthlyIncome,
  monthlyCategoryTotals,
  detectRecurringPayments,
  generateInsights,
} = useTransactions();

const { formatCurrency } = useCurrency();

const getFirstLine = (text: string) => text.split('\n')[0] || text;

const monthlyExpenseTotal = computed(() =>
  Math.abs(monthlyExpenses.value.reduce((sum, t) => sum + t.amount, 0))
);

const monthlyIncomeTotal = computed(() =>
  monthlyIncome.value.reduce((sum, t) => sum + t.amount, 0)
);

const budgetUsage = computed(() =>
  Math.min(1, monthlyExpenseTotal.value / MONTHLY_BUDGET)
);
const budgetUsageLabel = computed(() => {
  if (budgetUsage.value >= 1)
    return 'Budget exceeded. Dial back discretionary spend.';
  if (budgetUsage.value >= 0.8)
    return 'Close to the limit — keep a closer eye this week.';
  return 'Healthy pace. You have breathing room.';
});

const netCashFlow = computed(
  () => monthlyIncomeTotal.value - monthlyExpenseTotal.value
);

const recurringPayments = computed(() => detectRecurringPayments());

const normalizeSubscription = (payment: RecurringPayment) => {
  if (payment.frequency === 'weekly') return (payment.amount * 52) / 12;
  if (payment.frequency === 'yearly') return payment.amount / 12;
  return payment.amount;
};

const subscriptionBurn = computed(() =>
  recurringPayments.value.reduce(
    (sum, payment) => sum + normalizeSubscription(payment),
    0
  )
);

const recurringPreview = computed(() => recurringPayments.value.slice(0, 3));

const categoryBudgetProgress = computed(() => {
  return Object.entries(CATEGORY_BUDGETS)
    .map(([category, budget]) => {
      const spent = monthlyCategoryTotals.value[category as Category] || 0;
      const percent = budget ? Math.min(100, (spent / budget) * 100) : 0;
      return {
        category: category as Category,
        spent,
        budget: budget ?? 0,
        percent,
      };
    })
    .sort((a, b) => b.percent - a.percent);
});

const insights = computed(() => generateInsights());

const advisorNotes = computed(() => {
  const notes: { tag: string; title: string; detail: string }[] = [];

  const overBudget = categoryBudgetProgress.value.find(
    (item) => item.percent >= 95
  );
  if (overBudget) {
    notes.push({
      tag: 'CATEGORY',
      title: `${capitalize(overBudget.category)} is maxed out`,
      detail: `You've burned through ${formatMoney(
        overBudget.spent
      )} of the ${formatMoney(overBudget.budget)} envelope.`,
    });
  }

  if (netCashFlow.value < 0) {
    notes.push({
      tag: 'CASH FLOW',
      title: 'You are overspending this month',
      detail: `Reduce discretionary spend by ${formatMoney(
        Math.abs(netCashFlow.value)
      )} to break even.`,
    });
  }

  const subscriptionShare = subscriptionBurn.value / MONTHLY_BUDGET;
  if (subscriptionShare > 0.25) {
    notes.push({
      tag: 'SUBSCRIPTIONS',
      title: 'Subscriptions eat a quarter of your budget',
      detail: `Review recurring services — trimming ${formatMoney(
        subscriptionBurn.value * 0.2
      )} saves you this month.`,
    });
  }

  if (notes.length === 0 && insights.value.length) {
    notes.push({
      tag: 'INSIGHT',
      title: insights.value[0]?.message ?? '',
      detail: 'Auto insight based on your latest activity.',
    });
  }

  return notes;
});

const recentTransactions = computed(() => transactions.value.slice(0, 4));

const formatDate = (date: Date) => {
  if (isToday(date)) return 'Today';
  return format(date, 'MMM d');
};

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

const savingsCopy = computed(() => {
  if (netCashFlow.value > 0) {
    return `On pace to save ${formatMoney(netCashFlow.value)} this month.`;
  }
  if (netCashFlow.value === 0) return 'Break-even month. Keep momentum.';
  return `Need ${formatMoney(
    Math.abs(netCashFlow.value)
  )} to get back on track.`;
});

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);
</script>
