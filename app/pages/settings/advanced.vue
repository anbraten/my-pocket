<template>
  <div class="space-y-6">
    <UiCard class="space-y-4">
      <header>
        <p class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Categories</p>
        <h2 class="text-xl font-semibold text-stone-900 dark:text-stone-100">Apply your labels</h2>
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

    <UiCard variant="danger">
      <header class="mb-4">
        <p class="text-xs uppercase tracking-wider text-red-400 dark:text-red-300">Danger zone</p>
        <h2 class="text-xl font-semibold text-red-900 dark:text-red-100">Reset everything</h2>
        <p class="text-sm text-red-700 dark:text-red-300/80">This wipes every transaction from local storage.</p>
      </header>
      <UiButton block variant="danger" @click="clearAllData">Clear all data</UiButton>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
const { clearAllTransactions, bulkRecategorize } = useTransactions();

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

const clearAllData = () => {
  if (confirm('Are you sure you want to delete ALL transactions? This cannot be undone!')) {
    clearAllTransactions();
  }
};
</script>
