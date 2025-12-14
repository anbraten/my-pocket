export type Category =
  | 'groceries'
  | 'dining'
  | 'transport'
  | 'entertainment'
  | 'utilities'
  | 'shopping'
  | 'health'
  | 'income'
  | 'transfer'
  | 'other';

export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  description: string;
  category: Category;
  merchant?: string;
  isRecurring?: boolean;
  isAnomaly?: boolean;
  tags?: string[];
}

export interface CategoryStats {
  category: Category;
  total: number;
  count: number;
  average: number;
  percentage: number;
}

export interface Insight {
  type: 'anomaly' | 'recurring' | 'trend' | 'achievement';
  message: string;
  category?: Category;
  severity?: 'info' | 'warning' | 'success';
  timestamp: Date;
}

export interface RecurringPayment {
  merchant: string;
  amount: number;
  category: Category;
  frequency: 'weekly' | 'monthly' | 'yearly';
  lastDate: Date;
  nextExpectedDate?: Date;
  confidence: number;
  count: number;
}
