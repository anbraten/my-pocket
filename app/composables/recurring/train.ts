import { RecurringModel } from './model';
import trans from './recurring.json' assert { type: 'json' };

function omit<T, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

const trainData = trans.map((t) => ({
  isRecurring: t.recurring ?? false,
  transaction: omit(t, 'recurring'),
}));

console.log(RecurringModel.train(trainData));
