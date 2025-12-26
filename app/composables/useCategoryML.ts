import { useLocalStorage } from '@vueuse/core';
import type { Transaction } from '~/types';

export function useCategoryML() {
  const model = useLocalStorage('my-pocket:category-model', {});

  const classifier = computed(() => CategoryClassifier.import(model.value));

  const train = (transactions: Transaction[]) => {
    classifier.value.train(transactions);
    model.value = classifier.value.export();
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
