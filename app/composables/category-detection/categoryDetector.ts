import type { Transaction } from '~/types';
import { SimpleClassifier } from '../ml/simple-classifier';
import { normalizeDescription } from './keywordAnalyzer';

export class CategoryClassifier {
  private classifier: SimpleClassifier;

  constructor() {
    this.classifier = new SimpleClassifier();
  }

  public train(samples: Transaction[]) {
    const trainingData = samples.map((t) => ({
      text: this.tokenizeTransaction(t),
      category: t.category,
    }));
    this.classifier.train(trainingData);
  }

  public predict(transaction: Transaction): {
    category: string;
    confidence: number;
  } | null {
    return this.classifier.predict(this.tokenizeTransaction(transaction));
  }

  public export(): any {
    return this.classifier.serialize();
  }

  static import(data: any) {
    const classifier = new CategoryClassifier();
    classifier.classifier = new SimpleClassifier(data);
    return classifier;
  }

  private tokenizeTransaction(transaction: Transaction): string {
    const descriptionTokens = normalizeDescription(transaction.description);
    const amountBucket = this.getAmountBucket(transaction.amount);
    const dayOfMonth = transaction.date.getDate();
    return `${descriptionTokens} amount_${amountBucket} day_${dayOfMonth}`;
  }

  private getAmountBucket(amount: number): string {
    if (amount > 0) return 'income';
    if (amount < -1000) return 'large';
    if (amount < -500) return 'medium';
    return 'small';
  }
}
