export interface CategoryConfig {
  color: string;
  icon: string;
  keywords: string[];
}

export const CATEGORIES = {
  housing: {
    color: '#8b5cf6',
    icon: '🏠',
    keywords: [
      'rent',
      'miete',
      'mortgage',
      'hypothek',
      'property',
      'immobilie',
      'hausverwaltung',
      'wohnung',
      'apartment',
    ],
  },
  livelihood: {
    color: '#ec4899',
    icon: '🧾',
    keywords: [
      'electricity',
      'strom',
      'electric',
      'water',
      'wasser',
      'heating',
      'heizung',
      'gas',
      'internet',
      'wifi',
      'broadband',
      'phone',
      'mobile',
      'mobilfunk',
      'telekom',
      'vodafone',
      'o2',
      'insurance',
      'versicherung',
      'nebenkosten',
      'utilities',
      'household',
      'dm',
      'rossmann',
      'müller',
      'drogerie',
      'drugstore',
      'pharmacy',
      'apotheke',
    ],
  },
  groceries: {
    color: '#10b981',
    icon: '🛒',
    keywords: [
      'grocery',
      'supermarket',
      'lebensmittel',
      'aldi',
      'lidl',
      'rewe',
      'penny',
      'edeka',
      'netto',
      'kaufland',
      'food',
      'whole foods',
      'trader joe',
      'safeway',
      'walmart',
      'target',
    ],
  },
  leisure: {
    color: '#f59e0b',
    icon: '🎭',
    keywords: [
      'restaurant',
      'cafe',
      'coffee',
      'starbucks',
      'bar',
      'pub',
      'kneipe',
      'cinema',
      'kino',
      'theater',
      'concert',
      'konzert',
      'museum',
      'hobby',
      'sport',
      'gym',
      'fitness',
      'club',
      'event',
      'party',
      'social',
      'friends',
      'freizeit',
    ],
  },
  shopping: {
    color: '#06b6d4',
    icon: '🛍️',
    keywords: [
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
      'electronics',
      'furniture',
      'ikea',
      'media markt',
      'saturn',
      'entertainment',
      'netflix',
      'spotify',
      'disney',
      'streaming',
      'game',
      'playstation',
      'xbox',
    ],
  },
  transportation: {
    color: '#3b82f6',
    icon: '🚗',
    keywords: [
      'gas',
      'fuel',
      'benzin',
      'diesel',
      'tankstelle',
      'shell',
      'aral',
      'esso',
      'parking',
      'parken',
      'car',
      'auto',
      'vehicle',
      'fahrzeug',
      'repair',
      'werkstatt',
      'insurance',
      'kfz',
      'uber',
      'taxi',
      'öpnv',
      'public transport',
      'ticket',
      'fahrkarte',
    ],
  },
  savings: {
    color: '#22c55e',
    icon: '💰',
    keywords: [
      'savings',
      'sparen',
      'investment',
      'investition',
      'depot',
      'etf',
      'stock',
      'aktie',
      'fund',
      'fonds',
      'pension',
      'rente',
      'retirement',
      'anlage',
    ],
  },
  travel: {
    color: '#f97316',
    icon: '✈️',
    keywords: [
      'flight',
      'flug',
      'airline',
      'lufthansa',
      'ryanair',
      'hotel',
      'booking',
      'airbnb',
      'hostel',
      'train',
      'bahn',
      'db',
      'bus',
      'fernbus',
      'flixbus',
      'rental car',
      'mietwagen',
      'vacation',
      'urlaub',
      'reise',
      'travel',
      'trip',
    ],
  },
  health: {
    color: '#ef4444',
    icon: '🏥',
    keywords: [
      'doctor',
      'arzt',
      'hospital',
      'krankenhaus',
      'medical',
      'medizin',
      'health',
      'gesundheit',
      'clinic',
      'klinik',
      'dentist',
      'zahnarzt',
      'therapy',
      'therapie',
      'wellness',
      'spa',
      'massage',
      'physiotherapy',
    ],
  },
  income: {
    color: '#84cc16',
    icon: '💵',
    keywords: [
      'salary',
      'gehalt',
      'lohn',
      'payroll',
      'income',
      'einkommen',
      'payment received',
      'eingang',
      'überweisung eingang',
      'bonus',
      'refund',
      'erstattung',
      'cashback',
    ],
  },
  transfer: {
    color: '#8b5cf6',
    icon: '🔄',
    keywords: [
      'transfer',
      'überweisung',
      'payment sent',
      'ausgang',
      'kontoübertragung',
      'account transfer',
      'internal',
      'zwischenkonto',
      'tagesgeld',
    ],
  },
  other: {
    color: '#64748b',
    icon: '📦',
    keywords: [],
  },
} satisfies Record<string, CategoryConfig>;

export type Category = keyof typeof CATEGORIES;

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
 * Categorize a transaction using keyword matching
 */
export const categorizeTransaction = (description: string): Category => {
  const lowerDesc = description.toLowerCase();

  // Check keyword-based categories
  for (const [category, { keywords }] of Object.entries(CATEGORIES)) {
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
