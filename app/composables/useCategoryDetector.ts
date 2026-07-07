import type { Transaction } from '~/types';
import { SimpleClassifier } from './ml/simple-classifier';

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
    return {
      model: this.classifier,
    };
  }

  static import(data: any) {
    const classifier = new CategoryClassifier();
    classifier.classifier = new SimpleClassifier(data.model);
    return classifier;
  }

  private tokenizeTransaction(transaction: Transaction): string {
    const descriptionTokens = this.tokenize(transaction.description);
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

  private tokenize(text: string): string {
    return text
      .split(/\s+/)
      .filter((word) => !word.match(/^\d+$/)) // remove number-like tokens
      .filter((word) => !this.isStopWord(word))
      .join(' ');
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the',
      'and',
      'for',
      'with',
      'from',
      'this',
      'that',
      'was',
      'are',
      'der',
      'die',
      'das',
      'und',
      'fur',
      'mit',
      'von',
      'bei',
    ]);
    return stopWords.has(word);
  }
}
