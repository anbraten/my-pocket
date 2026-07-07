export class SimpleClassifier {
  // Stores word counts: { groceries: { starbucks: 5, coffee: 2 }, housing: { rent: 1 } }
  private model: Record<string, Record<string, number>> = {};
  private categoryCounts: Record<string, number> = {};
  private totalDocs = 0;

  constructor(classifierData?: {
    model: Record<string, Record<string, number>>;
    categoryCounts: Record<string, number>;
    totalDocs: number;
  }) {
    if (classifierData) {
      Object.assign(this, classifierData);
    }
  }

  public train(tokens: { text: string; category: string }[]) {
    for (const { category, text } of tokens) {
      if (!category) continue;

      const words = this.tokenize(text);
      if (!this.model[category]) {
        this.model[category] = {};
        this.categoryCounts[category] = 0;
      }

      this.categoryCounts[category]!++;
      this.totalDocs++;

      for (const word of words) {
        this.model[category]![word] = (this.model[category]![word] || 0) + 1;
      }
    }
  }

  public predict(description: string): {
    category: string;
    confidence: number;
  } | null {
    const words = this.tokenize(description);
    let bestCategory: string | null = null;
    let highestScore = -Infinity;
    let secondHighestScore = -Infinity;

    // Calculate log probabilities for all categories
    for (const category in this.model) {
      // Start with the log probability of the category itself (Prior)
      let score = Math.log(this.categoryCounts[category]! / this.totalDocs);

      for (const word of words) {
        // Calculate word probability within this category (using Laplace smoothing)
        const wordCount = this.model[category]![word] || 0;
        const totalWordsInCategory = Object.values(
          this.model[category]!,
        ).reduce((a, b) => a + b, 0);

        // Probability of word given category: (wordCount + 1) / (totalWords + vocabularySize)
        score += Math.log((wordCount + 1) / (totalWordsInCategory + 1000));
      }

      if (score > highestScore) {
        secondHighestScore = highestScore;
        highestScore = score;
        bestCategory = category;
      } else if (score > secondHighestScore) {
        secondHighestScore = score;
      }
    }

    // Confidence based on how much better the best score is vs second best
    const scoreDiff = highestScore - secondHighestScore;
    const confidence = Math.min(1, Math.max(0, 0.5 + scoreDiff / 10));

    return bestCategory ? { category: bestCategory, confidence } : null;
  }

  public serialize() {
    return {
      model: this.model,
      categoryCounts: this.categoryCounts,
      totalDocs: this.totalDocs,
    };
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2); // Ignore tiny words like 'a', 'to'
  }
}
