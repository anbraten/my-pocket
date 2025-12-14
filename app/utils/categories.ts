import type { Category } from '~/types'

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
  other: '#64748b'
}

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
  other: '📦'
}

export const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  groceries: ['grocery', 'supermarket', 'whole foods', 'trader joe', 'safeway', 'walmart', 'target', 'aldi', 'lidl', 'kroger'],
  dining: ['restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'burger', 'pizza', 'doordash', 'uber eats', 'grubhub', 'delivery'],
  transport: ['uber', 'lyft', 'gas', 'fuel', 'parking', 'transit', 'subway', 'train', 'bus', 'taxi', 'shell', 'chevron', 'exxon'],
  entertainment: ['netflix', 'spotify', 'hulu', 'disney', 'hbo', 'amazon prime', 'youtube', 'cinema', 'theater', 'concert', 'movie', 'game'],
  utilities: ['electric', 'water', 'gas', 'internet', 'phone', 'mobile', 'verizon', 'at&t', 't-mobile', 'comcast', 'spectrum'],
  shopping: ['amazon', 'ebay', 'shop', 'store', 'clothing', 'fashion', 'nike', 'adidas', 'zara', 'h&m'],
  health: ['pharmacy', 'doctor', 'hospital', 'medical', 'health', 'cvs', 'walgreens', 'clinic', 'dentist', 'gym', 'fitness'],
  income: ['salary', 'payroll', 'deposit', 'payment received', 'refund', 'cashback'],
  transfer: ['transfer', 'withdrawal', 'atm'],
  other: []
}
