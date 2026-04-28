type RecurringTransaction = {
  merchant: string;
  amount: number;
  count: number;
  frequency: 'monthly' | 'yearly' | 'weekly' | 'daily' | 'one-time';
  intervals?: number[]; // days between transactions
  amountStdDev?: number; // standard deviation of amounts
  lastDate?: string; // ISO date string of last transaction
};

type Model = {
  weights: number[];
  bias: number;
};

// Simple logistic regression implementation
const sigmoid = (z: number) => {
  // Clip z to prevent overflow
  const clipped = Math.max(-50, Math.min(50, z));
  return 1 / (1 + Math.exp(-clipped));
};

const featureSet = {
  countNorm: 0,
  countLog: 0,
  intervalCV: 0,
  maxIntervalDeviation: 0,
  amountCV: 0,
  amountLog: 0,
  isMonthly: 0,
  isYearly: 0,
  daysSinceLastNorm: 0,
  isOverdue: 0,
  hasEnoughData: 0,
};

type FeatureSet = typeof featureSet;

const preTrainedModel: Model = {
  bias: -0.8311996191067905,
  weights: [
    0.13070504388478021, -0.05618234133847903, -0.6298417015221216,
    -0.6294349088909538, -0.14326639523111168, 0.20906514001686582,
    0.2967858956092421, -0.9294600793945318, -0.778318858463863,
    -0.46184577583956293, 0.7978012010873499,
  ],
};

export class RecurringModel {
  private model: Model;

  constructor(model?: Model) {
    this.model = model ?? preTrainedModel;
  }

  private static extractFeatures(transaction: RecurringTransaction): number[] {
    const { count, amount, frequency } = transaction;

    const intervals = transaction.intervals || [];
    const avgInterval =
      intervals.length > 0
        ? intervals.reduce((s, i) => s + i, 0) / intervals.length
        : 30;

    // Calculate statistics
    const intervalStdDev =
      intervals.length > 1
        ? Math.sqrt(
            intervals.reduce((s, i) => s + Math.pow(i - avgInterval, 2), 0) /
              intervals.length
          )
        : 0;

    const intervalCV = avgInterval > 0 ? intervalStdDev / avgInterval : 0;

    const maxIntervalDeviation =
      intervals.length > 0 && avgInterval > 0
        ? Math.max(
            ...intervals.map((i) => Math.abs(i - avgInterval) / avgInterval)
          )
        : 0;

    // Relative amount variance: the same € deviation matters more for small
    // recurring transactions than for large ones.
    const amountMagnitude = Math.max(Math.abs(amount), 1); // stabilize near 0€
    const amountCV = transaction.amountStdDev
      ? transaction.amountStdDev / amountMagnitude
      : 0;

    const daysSinceLastTransaction = transaction.lastDate
      ? Math.floor(
          (new Date().getTime() - new Date(transaction.lastDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : undefined;

    // NORMALIZED features (critical for convergence!)
    const features: FeatureSet = {
      // Count features (normalized)
      countNorm: Math.min(count / 12, 1), // Cap at 12 months
      countLog: Math.log(count + 1) / Math.log(13), // Normalize log

      // Interval consistency (already 0-1 range)
      intervalCV: Math.min(intervalCV, 1),
      maxIntervalDeviation: Math.min(maxIntervalDeviation, 1),

      // Amount consistency (0-1 range)
      amountCV: Math.min(amountCV, 1),

      // Amount magnitude (normalized by log)
      amountLog: Math.log(Math.abs(amount) + 1) / 10, // Normalize to ~0-1

      // Frequency encoding (already 0-1)
      isMonthly: frequency === 'monthly' ? 1 : 0,
      isYearly: frequency === 'yearly' ? 1 : 0,

      // Time-based features (normalized)
      daysSinceLastNorm: Math.min((daysSinceLastTransaction || 0) / 90, 1),

      isOverdue:
        daysSinceLastTransaction && daysSinceLastTransaction > avgInterval * 1.5
          ? 1
          : 0,

      // Pattern strength
      hasEnoughData: count >= (frequency === 'yearly' ? 3 : 4) ? 1 : 0,
    };

    const values = Object.values(features);
    return values;
  }

  public static train(
    labeledData: { transaction: RecurringTransaction; isRecurring: boolean }[]
  ) {
    const X = labeledData.map((d) =>
      RecurringModel.extractFeatures(d.transaction)
    );
    const y = labeledData.map((d) => (d.isRecurring ? 1 : 0));

    const numFeatures = X[0].length;
    let weights = new Array(numFeatures).fill(0);
    let bias = 0;

    // CRITICAL: Lower learning rate + more iterations
    const learningRate = 0.1;
    const iterations = 2000;
    const batchSize = Math.min(32, X.length);

    const losses = [];
    let bestWeights = [...weights];
    let bestBias = bias;
    let bestLoss = Infinity;

    for (let iter = 0; iter < iterations; iter++) {
      // Mini-batch gradient descent
      const indices = Array.from({ length: X.length }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, batchSize);

      const gradWeights = new Array(numFeatures).fill(0);
      let gradBias = 0;
      let batchLoss = 0;

      for (const i of indices) {
        const z = X[i].reduce((sum, xi, j) => sum + xi * weights[j], 0) + bias;
        const prediction = sigmoid(z);
        const error = prediction - y[i];

        // Cross-entropy loss
        const loss =
          -y[i] * Math.log(prediction + 1e-10) -
          (1 - y[i]) * Math.log(1 - prediction + 1e-10);

        batchLoss += loss;

        // Gradients
        for (let j = 0; j < numFeatures; j++) {
          gradWeights[j] += error * X[i][j];
        }
        gradBias += error;
      }

      // Update weights with L2 regularization
      const lambda = 0.01; // Regularization strength
      for (let j = 0; j < numFeatures; j++) {
        weights[j] -=
          learningRate * (gradWeights[j] / batchSize + lambda * weights[j]);
      }
      bias -= (learningRate * gradBias) / batchSize;

      const avgLoss = batchLoss / batchSize;
      losses.push(avgLoss);

      // Track best model
      if (avgLoss < bestLoss) {
        bestLoss = avgLoss;
        bestWeights = [...weights];
        bestBias = bias;
      }

      // Early stopping if loss plateaus
      if (iter > 100 && losses.length > 50) {
        const recentLosses = losses.slice(-50);
        const avgRecent = recentLosses.reduce((s, l) => s + l, 0) / 50;
        if (Math.abs(avgLoss - avgRecent) < 0.001) {
          console.log(`Early stopping at iteration ${iter}`);
          break;
        }
      }
    }

    // Use best model
    weights = bestWeights;
    bias = bestBias;

    // Calculate training accuracy
    let correct = 0;
    const predictions = [];
    for (let i = 0; i < X.length; i++) {
      const z = X[i].reduce((sum, xi, j) => sum + xi * weights[j], 0) + bias;
      const prob = sigmoid(z);
      const predicted = prob > 0.5 ? 1 : 0;
      predictions.push(prob);
      if (predicted === y[i]) correct++;
    }

    const accuracy = correct / X.length;
    console.log(`Training accuracy: ${(accuracy * 100).toFixed(2)}%`);

    return {
      bias,
      weights,
    };
  }

  public predict(transaction: RecurringTransaction): number {
    const features = RecurringModel.extractFeatures(transaction);
    const z =
      features.reduce((sum, xi, j) => sum + xi * this.model.weights[j], 0) +
      this.model.bias;
    return sigmoid(z);
  }
}
