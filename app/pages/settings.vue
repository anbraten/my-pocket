<template>
  <div class="space-y-6">
    <UiCard class="space-y-6">
      <header>
        <p
          class="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400"
        >
          Preferences
        </p>
        <h1 class="text-2xl font-semibold text-black dark:text-white">
          Control panel
        </h1>
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Pick your currency and keep everything on-device.
        </p>
      </header>
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label
            class="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400"
            >Currency</label
          >
          <UiSelect v-model="currency" :options="currencySelects" />
          <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-2">
            Applies to dashboards, recurring transactions, and CSV exports.
          </p>
        </div>
        <div class="space-y-2">
          <label
            class="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400"
            >Appearance</label
          >
          <button
            type="button"
            role="switch"
            :aria-checked="!isDark"
            @click="toggleTheme"
            class="flex items-center justify-between rounded-lg px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
          >
            <div>
              <p
                class="text-sm font-semibold flex items-center gap-2 text-black dark:text-white"
              >
                <span>{{ isDark ? '🌙' : '☀️' }}</span>
                <span>{{ appearanceTitle }}</span>
              </p>
              <p class="text-xs text-neutral-600 dark:text-neutral-400">
                {{ appearanceCopy }}
              </p>
            </div>
            <span
              class="relative inline-flex h-6 w-11 items-center rounded-full transition"
              :class="isDark ? 'bg-neutral-600' : 'bg-emerald-500'"
            >
              <span
                class="inline-block h-5 w-5 rounded-full bg-white shadow transition"
                :class="isDark ? 'translate-x-1' : 'translate-x-5'"
              ></span>
            </span>
          </button>
          <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-2">
            Switch surface colors without leaving the page.
          </p>
        </div>
      </div>
      <div
        class="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 p-4 text-sm space-y-2"
      >
        <p
          class="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400"
        >
          Vault
        </p>
        <p class="text-2xl font-semibold text-black dark:text-white">
          {{ formatMoney(totalExpenses) }}
        </p>
        <p class="text-xs text-neutral-600 dark:text-neutral-400">
          Lifetime spend tracked
        </p>
        <p class="text-sm text-emerald-600 dark:text-emerald-400">
          {{ formatSignedMoney(totalIncome) }} collected
        </p>
        <p class="text-xs text-neutral-600 dark:text-neutral-400">
          Across {{ transactions.length }} records
        </p>
      </div>
    </UiCard>

    <UiCard class="space-y-4">
      <header>
        <p
          class="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400"
        >
          Import
        </p>
        <h2 class="text-xl font-semibold text-black dark:text-white">
          Drop a CSV
        </h2>
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Structured, local-only uploads.
        </p>
      </header>
      <div class="space-y-2">
        <label
          class="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400"
        >
          Bank Format
        </label>
        <UiSelect v-model="selectedParserNamer" :options="bankFormatOptions" />
        <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-2">
          Select your bank's CSV format for accurate parsing.
        </p>
      </div>
      <input
        type="file"
        accept=".csv"
        @change="handleFileUpload"
        class="block w-full text-sm text-black dark:text-white bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-3 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-white hover:file:bg-emerald-600"
      />
      <p
        v-if="importing"
        class="text-xs text-neutral-600 dark:text-neutral-400"
      >
        Processing {{ importedCount }} transactions...
      </p>
      <div
        v-if="importSuccess"
        class="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
      >
        ✅ {{ importedCount }} transactions imported.
      </div>
      <div
        v-if="importError"
        class="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
      >
        ❌ {{ importError }}
      </div>
    </UiCard>

    <section class="grid gap-4 md:grid-cols-2">
      <UiCard class="space-y-4">
        <header>
          <p
            class="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400"
          >
            Export
          </p>
          <h2 class="text-xl font-semibold text-black dark:text-white">
            Download snapshot
          </h2>
          <p class="text-xs text-neutral-600 dark:text-neutral-400">
            Everything stays in your browser.
          </p>
        </header>
        <UiButton block @click="exportToCSV">📥 Export CSV</UiButton>
      </UiCard>

      <UiCard class="space-y-3">
        <header>
          <p class="text-xs uppercase tracking-[0.3em] text-slate-400">
            Snapshot
          </p>
          <h2 class="text-xl font-semibold text-white">Vault totals</h2>
        </header>
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between">
            <dt class="text-slate-500">Transactions stored</dt>
            <dd class="text-white font-semibold">{{ transactions.length }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Lifetime expenses</dt>
            <dd class="text-white font-semibold">
              {{ formatMoney(totalExpenses) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Lifetime income</dt>
            <dd class="text-emerald-300 font-semibold">
              {{ formatSignedMoney(totalIncome) }}
            </dd>
          </div>
        </dl>
      </UiCard>
    </section>

    <UiCard variant="danger">
      <header class="mb-4">
        <p class="text-xs uppercase tracking-[0.3em] text-red-200">
          Danger zone
        </p>
        <h2 class="text-xl font-semibold text-white">Reset everything</h2>
        <p class="text-sm text-red-200/80">
          This wipes every transaction from local storage.
        </p>
      </header>
      <UiButton
        block
        variant="danger"
        class="bg-red-500 hover:bg-red-400"
        @click="clearAllData"
      >
        🗑️ Clear all data
      </UiButton>
    </UiCard>

    <p class="text-center text-xs text-slate-500">
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
} = useTransactions();

const { currency, currencyOptions, formatCurrency } = useCurrency();

const { toggleTheme, isDark } = useTheme();

const currencySelects = computed(() =>
  currencyOptions.map((option) => ({
    label: `${option.symbol} - ${option.label}`,
    value: option.value,
  }))
);

const appearanceTitle = computed(() =>
  isDark.value ? 'Dark mode' : 'Light mode'
);
const appearanceCopy = computed(() =>
  isDark.value
    ? 'Lower glare for late sessions.'
    : 'Bright contrast for daylight work.'
);

const selectedParserNamer = ref('generic');

const bankFormatOptions = computed(() =>
  Object.entries(BANK_PARSERS).map(([key, parser]) => ({
    label: parser.name,
    value: key,
  }))
);

const importing = ref(false);
const importSuccess = ref(false);
const importError = ref('');
const importedCount = ref(0);

const totalExpenses = computed(() =>
  Math.abs(expenses.value.reduce((sum, t) => sum + t.amount, 0))
);
const totalIncome = computed(() =>
  income.value.reduce((sum, t) => sum + t.amount, 0)
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
      categorizeTransaction
    );

    console.log('Parsed transactions:', { newTransactions, parserName, rows });

    addTransactions(newTransactions);
    importedCount.value = newTransactions.length;
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
      'Are you sure you want to delete ALL transactions? This cannot be undone!'
    )
  ) {
    clearAllTransactions();
  }
};
</script>
