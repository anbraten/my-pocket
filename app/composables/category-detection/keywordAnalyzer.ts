/**
 * Normalize description for consistent matching while preserving key information
 * Keeps important words and structure, removes dates/amounts/noise
 */
export function normalizeDescription(description: string): string {
  return (description.split('\n')[0] ?? description)
    .toLowerCase()
    .replace(/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/g, '') // Remove dates
    .replace(/\b\d+[.,]\d{2}\b/g, '') // Remove amounts like 123.45
    .replace(/[^a-z0-9\s*]/g, ' ') // Keep * for PayPal, convert special chars to space
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 80); // Keep more context
}

const normalizeKeyword = (keyword: string): string =>
  keyword
    .toLowerCase()
    .replace(/[^a-z0-9\s*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Pre-compiled per-category regex arrays, built once on first call.
let compiledKeywords: Array<{ category: string; patterns: RegExp[] }> | null =
  null;

function getCompiledKeywords() {
  if (!compiledKeywords) {
    compiledKeywords = Object.entries(CATEGORIES)
      .filter(([, { keywords }]) => keywords.length > 0)
      .map(([category, { keywords }]) => ({
        category,
        patterns: keywords.map((kw) => {
          const escaped = normalizeKeyword(kw).replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&',
          );
          return new RegExp(`\\b${escaped}\\b`);
        }),
      }));
  }
  return compiledKeywords;
}

/**
 * Categorize a transaction using keyword matching.
 * Scores every category by number of matching keywords and returns the best.
 */
export function categorizeTransactionByKeywords(description: string): Category {
  const normalized = normalizeDescription(description);

  let bestCategory: Category = 'other';
  let bestScore = 0;

  for (const { category, patterns } of getCompiledKeywords()) {
    const score = patterns.filter((re) => re.test(normalized)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category as Category;
    }
  }

  return bestCategory;
}
