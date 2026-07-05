<template>
  <div class="space-y-6">
    <UiCard class="space-y-4">
      <header>
        <p class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Import</p>
        <h2 class="text-xl font-semibold text-stone-900 dark:text-stone-100">Drop a CSV</h2>
        <p class="text-sm text-stone-500 dark:text-stone-400">Structured, local-only uploads.</p>
      </header>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <label class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Bank Format</label>
          <UiSelect v-model="selectedParserName" :options="bankFormatOptions" />
        </div>
        <div class="space-y-2">
          <label class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Account</label>
          <UiSelect v-model="selectedImportAccountId" :options="accountOptions" />
        </div>
      </div>
      <input
        type="file"
        accept=".csv"
        @change="handleFileUpload"
        class="block w-full text-sm text-stone-900 dark:text-stone-100 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg px-4 py-3 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700"
      />
      <p v-if="importing" class="text-xs text-stone-500 dark:text-stone-400">Processing transactions…</p>
      <div
        v-if="importSuccess"
        class="rounded-lg border border-emerald-200 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
      >
        <span v-if="importedCount > 0">{{ importedCount }} transactions imported.</span>
        <span v-if="importedCount > 0 && taggedCount > 0"> </span>
        <span v-if="taggedCount > 0">{{ taggedCount }} existing transactions tagged to account.</span>
        <span v-if="importedCount === 0 && taggedCount === 0">No new transactions found.</span>
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
        <p class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Backup</p>
        <h2 class="text-xl font-semibold text-stone-900 dark:text-stone-100">Backup & Restore</h2>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Export all your data or restore from a previous backup. Everything stays on your device.
        </p>
      </header>
      <div class="grid gap-6 sm:grid-cols-2">
        <div class="space-y-2">
          <p class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Export</p>
          <UiButton block @click="exportBackup">Download backup</UiButton>
          <p class="text-xs text-stone-500 dark:text-stone-400">Saves all transactions and accounts as a JSON file.</p>
        </div>
        <div class="space-y-2">
          <p class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Restore</p>
          <input
            type="file"
            accept=".json"
            :disabled="restoring"
            @change="handleRestoreUpload"
            class="block w-full text-sm text-stone-900 dark:text-stone-100 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg px-4 py-3 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700 disabled:opacity-50"
          />
          <p class="text-xs text-stone-500 dark:text-stone-400">Replaces all existing data with the selected backup.</p>
        </div>
      </div>
      <p v-if="restoring" class="text-xs text-stone-500 dark:text-stone-400">Restoring…</p>
      <div
        v-if="restoreError"
        class="rounded-lg border border-red-200 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
      >
        {{ restoreError }}
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { parseCSV, csvToTransactions, BANK_PARSERS } from '~/utils/csvParser';
import { db } from '~/utils/db';

const { addTransactions, categorizeTransaction } = useTransactions();
const { accountOptions } = useAccounts();

const selectedParserName = ref('generic');
const selectedImportAccountId = ref('');

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
const taggedCount = ref(0);

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  importing.value = true;
  importSuccess.value = false;
  importError.value = '';
  importedCount.value = 0;

  try {
    const rows = await parseCSV(file, selectedParserName.value);
    const parsed = csvToTransactions(rows, selectedParserName.value, categorizeTransaction);
    const newTransactions = parsed.map((t) =>
      selectedImportAccountId.value ? { ...t, accountId: selectedImportAccountId.value } : t,
    );

    const result = await addTransactions(newTransactions);
    importedCount.value = result.added;
    taggedCount.value = result.tagged;
    importSuccess.value = true;

    setTimeout(() => { importSuccess.value = false; }, 5000);
  } catch (error: any) {
    importError.value = error.message || 'Failed to import CSV';
    setTimeout(() => { importError.value = ''; }, 5000);
  } finally {
    importing.value = false;
    target.value = '';
  }
};

const exportBackup = async () => {
  const [txs, accs, categoryModel] = await Promise.all([
    db.transactions.toArray(),
    db.accounts.toArray(),
    db.categoryModel.toArray(),
  ]);
  const backup = { version: 1, exportedAt: new Date().toISOString(), transactions: txs, accounts: accs, categoryModel };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `my-pocket-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const restoring = ref(false);
const restoreError = ref('');

const handleRestoreUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (!confirm('This will replace ALL existing data with the backup. This cannot be undone. Continue?')) {
    target.value = '';
    return;
  }

  restoring.value = true;
  restoreError.value = '';

  try {
    const text = await file.text();
    const backup = JSON.parse(text);

    if (!Array.isArray(backup.transactions) || !Array.isArray(backup.accounts)) {
      throw new Error('Invalid backup file: missing transactions or accounts.');
    }

    const txs = backup.transactions.map((t: any) => ({ ...t, date: new Date(t.date) }));

    await db.transaction('rw', db.transactions, db.accounts, db.categoryModel, async () => {
      await db.transactions.clear();
      await db.accounts.clear();
      await db.categoryModel.clear();
      if (txs.length) await db.transactions.bulkAdd(txs);
      if (backup.accounts.length) await db.accounts.bulkAdd(backup.accounts);
      if (backup.categoryModel?.length) await db.categoryModel.bulkAdd(backup.categoryModel);
    });

    window.location.reload();
  } catch (e: any) {
    restoreError.value = e.message || 'Failed to restore backup.';
    target.value = '';
  } finally {
    restoring.value = false;
  }
};
</script>
