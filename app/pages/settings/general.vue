<template>
  <UiCard class="space-y-6">
    <header>
      <h2 class="text-xl font-semibold text-stone-900 dark:text-stone-100">General</h2>
      <p class="text-sm text-stone-500 dark:text-stone-400">Currency, appearance, and vault overview.</p>
    </header>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="space-y-2">
        <label class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Currency</label>
        <UiSelect v-model="currency" :options="currencySelects" />
        <p class="text-xs text-stone-500 dark:text-stone-400 mt-2">
          Applies to dashboards, recurring transactions, and CSV exports.
        </p>
      </div>
      <div class="space-y-2">
        <label class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Appearance</label>
        <div class="flex rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 p-1 gap-1">
          <button
            type="button"
            @click="isDark && toggleTheme()"
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-150"
            :class="!isDark
              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            Light
          </button>
          <button
            type="button"
            @click="!isDark && toggleTheme()"
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-150"
            :class="isDark
              ? 'bg-stone-700 text-stone-100 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            Dark
          </button>
        </div>
        <p class="text-xs text-stone-500 dark:text-stone-400">Switch surface colors without leaving the page.</p>
      </div>
    </div>

    <div class="rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-4 text-sm space-y-2">
      <p class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Vault</p>
      <p class="text-2xl font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
        {{ formatMoney(totalExpenses) }}
      </p>
      <p class="text-xs text-stone-500 dark:text-stone-400">Lifetime spend tracked</p>
      <p class="text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
        {{ formatSignedMoney(totalIncome) }} collected
      </p>
      <p class="text-xs text-stone-500 dark:text-stone-400">Across {{ transactions.length }} records</p>
    </div>
  </UiCard>
</template>

<script setup lang="ts">
const { transactions, expenses, income } = useTransactions();
const { currency, currencyOptions, formatCurrency } = useCurrency();
const { toggleTheme, isDark } = useTheme();

const currencySelects = computed(() =>
  currencyOptions.map((option) => ({
    label: `${option.symbol} - ${option.label}`,
    value: option.value,
  })),
);

const totalExpenses = computed(() =>
  Math.abs(expenses.value.reduce((sum, t) => sum + t.amount, 0)),
);
const totalIncome = computed(() =>
  income.value.reduce((sum, t) => sum + t.amount, 0),
);

const formatMoney = (value: number, options?: Intl.NumberFormatOptions) =>
  formatCurrency(value, { maximumFractionDigits: 2, ...options });

const formatSignedMoney = (value: number) =>
  formatMoney(value, { signDisplay: 'always', minimumFractionDigits: 2, maximumFractionDigits: 2 });
</script>
