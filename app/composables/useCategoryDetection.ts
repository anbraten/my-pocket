import type { Transaction } from '~/types';
import { categorizeTransactionByKeywords } from './category-detection/keywordAnalyzer';
import { migrateLegacyData } from '~/utils/db/migrateLegacyData';
import { db } from '~/utils/db';
import { CategoryClassifier } from './category-detection/categoryDetector';

const model = shallowRef<unknown>({});
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

export function useCategoryDetection() {
  ensureLoaded();

  const PREDICTION_CONFIDENCE_THRESHOLD = 0.6;

  const classifier = computed(() => CategoryClassifier.import(model.value));

  const train = (transactions: Transaction[]) => {
    classifier.value.train(transactions);
    const exported = classifier.value.export();
    model.value = exported;
    if (import.meta.client) {
      db.categoryModel.put({ id: 'default', model: toRaw(exported) });
    }
  };

  const trainSample = (transaction: Transaction) => train([transaction]);

  function predict(transaction: Transaction): Category {
    const prediction = classifier.value.predict(transaction);
    if (prediction && prediction.confidence > PREDICTION_CONFIDENCE_THRESHOLD) {
      return prediction.category as Category;
    }

    return categorizeTransactionByKeywords(transaction.description) || 'other';
  }

  return {
    train,
    trainSample,
    predict,
  };
}
