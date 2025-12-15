/**
 * Calculate string similarity using Levenshtein distance
 * @returns A number between 0 and 1, where 1 is identical
 */
export function getSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = (s1: string, s2: string): number => {
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1] ?? 0;
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue =
              Math.min(Math.min(newValue, lastValue), costs[j] ?? 0) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length] ?? 0;
  };

  return (longer.length - editDistance(longer, shorter)) / longer.length;
}
