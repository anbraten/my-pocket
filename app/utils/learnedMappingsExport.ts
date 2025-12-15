import type { LearnedMapping } from './categories';

/**
 * Export learned mappings to JSON file
 */
export const downloadLearnedMappings = (mappings: LearnedMapping[]) => {
  const json = JSON.stringify(mappings, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `my-pocket-learned-mappings-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Parse and validate imported learned mappings
 */
export const parseLearnedMappings = (
  jsonString: string
): LearnedMapping[] | null => {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return null;

    // Validate structure
    const valid = parsed.every(
      (m) =>
        typeof m.description === 'string' &&
        typeof m.category === 'string' &&
        typeof m.count === 'number'
    );

    if (!valid) return null;

    return parsed.map((m) => ({
      ...m,
      lastUpdated: m.lastUpdated ? new Date(m.lastUpdated) : new Date(),
    }));
  } catch {
    return null;
  }
};
