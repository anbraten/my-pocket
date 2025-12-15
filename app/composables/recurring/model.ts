type Transaction = {
  merchant: string;
  amount: number;
  count: number;
  frequency: 'monthly' | 'yearly' | 'weekly' | 'daily' | 'one-time';
  intervals?: number[]; // days between transactions
  amountStdDev?: number; // standard deviation of amounts
  daysSinceLastTransaction?: number;
};

type Model = {
  weights: number[];
  bias: number;
  featureNames: string[];
};

// Simple logistic regression implementation
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export class RecurringModel {
  private model: Model | null = null;

  constructor(model?: Model) {
    if (model) {
      this.model = model;
    }
  }

  private extractFeatures(transaction: Transaction): number[] {
    const { count, amount, frequency } = transaction;

    // Extract intervals from transaction history
    const intervals = transaction.intervals || [];
    const avgInterval = intervals.reduce((s, i) => s + i, 0) / intervals.length;

    // Feature engineering
    const features = {
      // Count features
      count: count,
      countLog: Math.log(count + 1),

      // Interval consistency
      intervalCV:
        intervals.length > 1
          ? Math.sqrt(
              intervals.reduce((s, i) => s + Math.pow(i - avgInterval, 2), 0) /
                intervals.length
            ) / avgInterval
          : 1,
      maxIntervalDeviation:
        intervals.length > 0
          ? Math.max(
              ...intervals.map((i) => Math.abs(i - avgInterval) / avgInterval)
            )
          : 1,

      // Amount consistency
      amountCV: transaction.amountStdDev
        ? transaction.amountStdDev / Math.abs(amount)
        : 0.5,
      amountAbs: Math.abs(amount),
      amountLog: Math.log(Math.abs(amount) + 1),

      // Frequency encoding
      isMonthly: frequency === 'monthly' ? 1 : 0,
      isYearly: frequency === 'yearly' ? 1 : 0,

      // Time-based features
      daysSinceLastTransaction: transaction.daysSinceLastTransaction ?? 0,
      isOverdue:
        transaction.daysSinceLastTransaction ?? 0 > avgInterval * 1.3 ? 1 : 0,
    };

    return Object.values(features);
  }

  public train(
    labeledData: { transaction: Transaction; isRecurring: boolean }[]
  ) {
    // Simple gradient descent for logistic regression
    const X = labeledData.map((d) => this.extractFeatures(d.transaction));
    const y = labeledData.map((d) => (d.isRecurring ? 1 : 0));

    const numFeatures = X[0].length;
    let weights = new Array(numFeatures).fill(0);
    let bias = 0;

    const learningRate = 0.01;
    const iterations = 1000;

    for (let iter = 0; iter < iterations; iter++) {
      let totalLoss = 0;
      const gradWeights = new Array(numFeatures).fill(0);
      let gradBias = 0;

      for (let i = 0; i < X.length; i++) {
        const z = X[i].reduce((sum, xi, j) => sum + xi * weights[j], 0) + bias;
        const prediction = sigmoid(z);
        const error = prediction - y[i];

        totalLoss +=
          -y[i] * Math.log(prediction + 1e-10) -
          (1 - y[i]) * Math.log(1 - prediction + 1e-10);

        for (let j = 0; j < numFeatures; j++) {
          gradWeights[j] += error * X[i][j];
        }
        gradBias += error;
      }

      for (let j = 0; j < numFeatures; j++) {
        weights[j] -= (learningRate * gradWeights[j]) / X.length;
      }
      bias -= (learningRate * gradBias) / X.length;
    }

    this.model = {
      weights,
      bias,
      featureNames: Object.keys(
        this.extractFeatures(labeledData[0].transaction)
      ),
    };

    return this.model;
  }

  public predict(transaction: Transaction): number | null {
    if (!this.model) return null;

    const features = this.extractFeatures(transaction);
    const z =
      features.reduce((sum, xi, j) => sum + xi * this.model.weights[j], 0) +
      this.model.bias;
    return sigmoid(z);
  }
}
