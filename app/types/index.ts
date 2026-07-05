import { type Category } from '~/utils/categories';

export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  description: string;
  category: Category;
  isRecurring?: boolean;
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
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  lastDate: Date;
  nextExpectedDate?: Date;
  count: number;
  transactionIds: string[];
  intervals?: number[]; // days between transactions
  confidence: number; // 0-1, confidence score
  amountStdDev?: number; // standard deviation for amount variance
}

export interface UserSettings {
  monthlyIncomeTarget: number;
  savingsGoalPercent: number;
  currency: string;
  recurringConfidenceThreshold?: number; // minimum confidence to show recurring items (0-1)
}
