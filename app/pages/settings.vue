<template>
  <div class="space-y-6">
    <UiCard class="space-y-6">
      <header>
        <p
          class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400"
        >
          Preferences
        </p>
        <h1 class="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Control panel
        </h1>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Pick your currency and keep everything on-device.
        </p>
      </header>
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label
            class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400"
            >Currency</label
          >
          <UiSelect v-model="currency" :options="currencySelects" />
          <p class="text-xs text-stone-500 dark:text-stone-400 mt-2">
            Applies to dashboards, recurring transactions, and CSV exports.
          </p>
        </div>
        <div class="space-y-2">
          <label
            class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400"
            >Appearance</label
          >
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
          <p class="text-xs text-stone-500 dark:text-stone-400">
            Switch surface colors without leaving the page.
          </p>
        </div>
      </div>
      <div
        class="rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-4 text-sm space-y-2"
      >
        <p class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Vault
        </p>
        <p class="text-2xl font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
          {{ formatMoney(totalExpenses) }}
        </p>
        <p class="text-xs text-stone-500 dark:text-stone-400">
          Lifetime spend tracked
        </p>
        <p class="text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
          {{ formatSignedMoney(totalIncome) }} collected
        </p>
        <p class="text-xs text-stone-500 dark:text-stone-400">
          Across {{ transactions.length }} records
        </p>
      </div>
    </UiCard>

    <UiCard class="space-y-4">
      <header>
        <p
          class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400"
        >
          Import
        </p>
        <h2 class="text-xl font-semibold text-stone-900 dark:text-stone-100">
          Drop a CSV
        </h2>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Structured, local-only uploads.
        </p>
      </header>
      <div class="space-y-2">
        <label
          class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400"
        >
          Bank Format
        </label>
        <UiSelect v-model="selectedParserNamer" :options="bankFormatOptions" />
        <p class="text-xs text-stone-500 dark:text-stone-400 mt-2">
          Select your bank's CSV format for accurate parsing.
        </p>
      </div>
      <input
        type="file"
        accept=".csv"
        @change="handleFileUpload"
        class="block w-full text-sm text-stone-900 dark:text-stone-100 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg px-4 py-3 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700"
      />
      <p
        v-if="importing"
        class="text-xs text-stone-500 dark:text-stone-400"
      >
        Processing {{ importedCount }} transactions...
      </p>
      <div
        v-if="importSuccess"
        class="rounded-lg border border-emerald-200 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
      >
        {{ importedCount }} transactions imported.
      </div>
      <div
        v-if="importError"
        class="rounded-lg border border-red-200 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
      >
        {{ importError }}
      </div>
    </UiCard>

    <UiCard class="space-y-4">
      <header>
        <p class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Categories
        </p>
        <h2 class="text-xl font-semibold text-stone-900 dark:text-stone-100">
          Apply your labels
        </h2>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Retrain on everything you've labeled and fill in all uncategorized transactions.
        </p>
      </header>
      <UiButton block :disabled="isRecategorizing" @click="runBulkRecategorize">
        {{ isRecategorizing ? 'Working…' : 'Recategorize uncategorized transactions' }}
      </UiButton>
      <div
        v-if="recategorizeResult !== null"
        class="rounded-lg border border-emerald-200 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
      >
        {{ recategorizeResult === 0 ? 'No uncategorized transactions found.' : `${recategorizeResult} transaction${recategorizeResult === 1 ? '' : 's'} categorized.` }}
      </div>
    </UiCard>

    <section class="grid gap-4 md:grid-cols-2">
      <UiCard class="space-y-4">
        <header>
          <p
            class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400"
          >
            Export
          </p>
          <h2 class="text-xl font-semibold text-stone-900 dark:text-stone-100">
            Download snapshot
          </h2>
          <p class="text-xs text-stone-500 dark:text-stone-400">
            Everything stays in your browser.
          </p>
        </header>
        <UiButton block @click="exportToCSV">📥 Export CSV</UiButton>
      </UiCard>

      <UiCard class="space-y-3">
        <header>
          <p class="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Snapshot
          </p>
          <h2 class="text-xl font-semibold text-stone-900 dark:text-stone-100">Vault totals</h2>
        </header>
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between">
            <dt class="text-stone-500 dark:text-stone-400">Transactions stored</dt>
            <dd class="text-stone-900 dark:text-stone-100 font-semibold tabular-nums">{{ transactions.length }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-stone-500 dark:text-stone-400">Lifetime expenses</dt>
            <dd class="text-stone-900 dark:text-stone-100 font-semibold tabular-nums">
              {{ formatMoney(totalExpenses) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-stone-500 dark:text-stone-400">Lifetime income</dt>
            <dd class="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
              {{ formatSignedMoney(totalIncome) }}
            </dd>
          </div>
        </dl>
      </UiCard>
    </section>

    <UiCard variant="danger">
      <header class="mb-4">
        <p class="text-xs uppercase tracking-wider text-red-400 dark:text-red-300">
          Danger zone
        </p>
        <h2 class="text-xl font-semibold text-red-900 dark:text-red-100">Reset everything</h2>
        <p class="text-sm text-red-700 dark:text-red-300/80">
          This wipes every transaction from local storage.
        </p>
      </header>
      <UiButton block variant="danger" @click="clearAllData">
        Clear all data
      </UiButton>
    </UiCard>

    <p class="text-center text-xs text-stone-500 dark:text-stone-400">
      MyPocket runs entirely on your device — no accounts, no servers.
    </p>
  </div>
</template>

<script setup lang="ts">
import { parseCSV, csvToTransactions, BANK_PARSERS } from '~/utils/csvParser';

const {
  transactions,
  expenses,
  income,
  addTransactions,
  clearAllTransactions,
  categorizeTransaction,
  bulkRecategorize,
} = useTransactions();

const isRecategorizing = ref(false);
const recategorizeResult = ref<number | null>(null);

const runBulkRecategorize = async () => {
  isRecategorizing.value = true;
  recategorizeResult.value = null;
  try {
    recategorizeResult.value = await bulkRecategorize();
  } finally {
    isRecategorizing.value = false;
  }
};

const { currency, currencyOptions, formatCurrency } = useCurrency();

const { toggleTheme, isDark } = useTheme();

const currencySelects = computed(() =>
  currencyOptions.map((option) => ({
    label: `${option.symbol} - ${option.label}`,
    value: option.value,
  })),
);

const selectedParserNamer = ref('generic');

const bankFormatOptions = computed(() =>
  Object.entries(BANK_PARSERS).map(([key, parser]) => ({
    label: parser.name,
    value: key,
  })),
);

const importing = ref(false);
const importSuccess = ref(false);
const importError = ref('');
const importedCount = ref(0);

const totalExpenses = computed(() =>
  Math.abs(expenses.value.reduce((sum, t) => sum + t.amount, 0)),
);
const totalIncome = computed(() =>
  income.value.reduce((sum, t) => sum + t.amount, 0),
);

const formatMoney = (value: number, options?: Intl.NumberFormatOptions) =>
  formatCurrency(value, {
    maximumFractionDigits: 2,
    ...options,
  });

const formatSignedMoney = (value: number) =>
  formatMoney(value, {
    signDisplay: 'always',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  importing.value = true;
  importSuccess.value = false;
  importError.value = '';
  importedCount.value = 0;

  try {
    const parserName = selectedParserNamer.value;

    const rows = await parseCSV(file, parserName);

    const newTransactions = csvToTransactions(
      rows,
      parserName,
      categorizeTransaction,
    );

    // console.log('Parsed transactions:', { newTransactions, parserName, rows });

    const addedCount = await addTransactions(newTransactions);
    importedCount.value = addedCount;
    importSuccess.value = true;

    setTimeout(() => {
      importSuccess.value = false;
    }, 5000);
  } catch (error: any) {
    importError.value = error.message || 'Failed to import CSV';
    setTimeout(() => {
      importError.value = '';
    }, 5000);
  } finally {
    importing.value = false;
    target.value = '';
  }
};

const exportToCSV = () => {
  const headers = ['Date', 'Description', 'Amount', 'Category'];
  const rows = transactions.value.map((t) => [
    t.date.toISOString().split('T')[0],
    t.description,
    t.amount.toString(),
    t.category,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `my-pocket-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const clearAllData = () => {
  if (
    confirm(
      'Are you sure you want to delete ALL transactions? This cannot be undone!',
    )
  ) {
    clearAllTransactions();
  }
};
</script>
