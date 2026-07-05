import { db } from '~/utils/db';
import { migrateLegacyData } from '~/utils/db/migrateLegacyData';
import type { Transaction } from '~/types';

const model = ref<unknown>({});
let initPromise: Promise<void> | null = null;

function ensureLoaded() {
  if (!import.meta.client) return Promise.resolve();
  if (!initPromise) {
    initPromise = (async () => {
      await migrateLegacyData();
      const row = await db.categoryModel.get('default');
      if (row) model.value = row.model;
    })();
  }
  return initPromise;
}

export function useCategoryML() {
  ensureLoaded();

  const classifier = computed(() => CategoryClassifier.import(model.value));

  const train = (transactions: Transaction[]) => {
    classifier.value.train(transactions);
    model.value = classifier.value.export();
    if (import.meta.client) {
      db.categoryModel.put({ id: 'default', model: model.value });
    }
  };

  const trainSample = (transaction: Transaction) => train([transaction]);

  const predict = (transaction: Transaction) =>
    classifier.value.predict(transaction);

  return {
    train,
    trainSample,
    predict,
  };
}
