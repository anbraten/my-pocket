/**
 * Export ML model to JSON file for download
 */
export const downloadMLModel = (modelData: any) => {
  const json = JSON.stringify(modelData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `my-pocket-ml-model-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Parse and validate imported ML model
 */
export const parseMLModel = (jsonString: string): any | null => {
  try {
    const parsed = JSON.parse(jsonString);

    // Basic validation
    if (
      !parsed.version ||
      !parsed.categoryFrequency ||
      !parsed.wordFrequency ||
      typeof parsed.totalDocuments !== 'number'
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};
