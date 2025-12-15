import type { Category } from '~/types';

/**
 * Learned category mapping from user corrections
 *
 * This system automatically learns from manual category adjustments:
 * 1. When a user changes a transaction's category, the description->category mapping is stored
 * 2. Future transactions with similar descriptions are automatically categorized using learned data
 * 3. Learned mappings take priority over keyword-based categorization
 * 4. Can be exported/imported for sharing across users
 */
export interface LearnedMapping {
  description: string; // Normalized transaction description
  category: Category;
  count: number; // How many times user has set this
  lastUpdated: Date;
}

export const CATEGORY_COLORS: Record<Category, string> = {
  groceries: '#10b981',
  dining: '#f59e0b',
  transport: '#3b82f6',
  entertainment: '#ec4899',
  utilities: '#8b5cf6',
  shopping: '#06b6d4',
  health: '#ef4444',
  income: '#22c55e',
  transfer: '#6b7280',
  other: '#64748b',
};

export const CATEGORY_ICONS: Record<Category, string> = {
  groceries: '🛒',
  dining: '🍽️',
  transport: '🚗',
  entertainment: '🎬',
  utilities: '💡',
  shopping: '🛍️',
  health: '🏥',
  income: '💰',
  transfer: '↔️',
  other: '📦',
};

export const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  groceries: [
    'grocery',
    'supermarket',
    'whole foods',
    'trader joe',
    'safeway',
    'walmart',
    'target',
    'aldi',
    'lidl',
    'kroger',
    'rewe',
    'penny',
    'dm-drogerie',
    'edeka',
    'rossmann',
  ],
  dining: [
    'restaurant',
    'cafe',
    'coffee',
    'starbucks',
    'mcdonald',
    'burger',
    'pizza',
    'doordash',
    'uber eats',
    'grubhub',
    'delivery',
  ],
  transport: [
    'uber',
    'lyft',
    'gas',
    'fuel',
    'parking',
    'transit',
    'subway',
    'train',
    'bus',
    'taxi',
    'shell',
    'chevron',
    'exxon',
  ],
  entertainment: [
    'netflix',
    'spotify',
    'hulu',
    'disney',
    'hbo',
    'amazon prime',
    'youtube',
    'cinema',
    'theater',
    'concert',
    'movie',
    'game',
  ],
  utilities: [
    'electric',
    'water',
    'gas',
    'internet',
    'phone',
    'mobile',
    'verizon',
    'at&t',
    't-mobile',
    'comcast',
    'spectrum',
  ],
  shopping: [
    'amazon',
    'amzn',
    'ebay',
    'shop',
    'store',
    'clothing',
    'fashion',
    'nike',
    'adidas',
    'zara',
    'h&m',
  ],
  health: [
    'pharmacy',
    'doctor',
    'hospital',
    'medical',
    'health',
    'cvs',
    'walgreens',
    'clinic',
    'dentist',
    'gym',
    'fitness',
  ],
  income: [
    'salary',
    'payroll',
    'deposit',
    'payment received',
    'refund',
    'cashback',
    'gehalt',
    'lohn',
  ],
  transfer: ['transfer', 'withdrawal', 'atm', 'trade', 'depot', 'deposit'],
  other: [],
};

/**
 * Normalize description for consistent matching while preserving key information
 * Keeps important words and structure, removes dates/amounts/noise
 */
export const normalizeDescription = (description: string): string => {
  return description
    .toLowerCase()
    .replace(/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/g, '') // Remove dates
    .replace(/\b\d+[.,]\d{2}\b/g, '') // Remove amounts like 123.45
    .replace(/[^a-z0-9\s*]/g, ' ') // Keep * for PayPal, convert special chars to space
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 80); // Keep more context
};

/**
 * Categorize a transaction using learned mappings and keyword fallback
 */
export const categorizeTransaction = (
  description: string,
  learnedMappings: LearnedMapping[]
): Category => {
  const normalizedDesc = normalizeDescription(description);
  const lowerDesc = description.toLowerCase();

  // 1. Check learned mappings first (user preferences take priority)
  // Try exact match first
  let learned = learnedMappings.find((m) => m.description === normalizedDesc);

  // If no exact match, try partial match (at least 70% of learned description must match)
  if (!learned) {
    learned = learnedMappings.find((m) => {
      const learnedWords = m.description.split(' ').filter((w) => w.length > 2);
      const descWords = normalizedDesc.split(' ');
      const matchingWords = learnedWords.filter((w) =>
        descWords.some((dw) => dw.includes(w) || w.includes(dw))
      );
      return matchingWords.length >= Math.ceil(learnedWords.length * 0.7);
    });
  }

  if (learned) {
    return learned.category;
  }

  // 2. Check keyword-based categories
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    Category,
    string[]
  ][]) {
    if (
      keywords.some((keyword: string) =>
        lowerDesc.includes(keyword.toLowerCase())
      )
    ) {
      return category as Category;
    }
  }

  return 'other';
};
