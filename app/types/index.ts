import { type Category } from '~/utils/categories';

export type AccountType = 'checking' | 'savings' | 'investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  color: string; // hex color
}

export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  description: string;
  category: Category;
  isRecurring?: boolean;
  accountId?: string;
  isTransfer?: boolean;
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
  id: string; // set by worker as `${description}|${amount}`
  description: string;
  amount: number;
  category: Category;
  frequency:
    | 'daily'
    | 'weekly'
    | 'biweekly'
    | 'monthly'
    | 'quarterly'
    | 'yearly';
  lastDate: Date;
  nextExpectedDate?: Date;
  transactionIds: string[];
  intervals?: number[]; // days between transactions
  confidence: number; // 0-1, confidence score
  amountStdDev?: number; // standard deviation for amount variance
}

// Snapshot of a cluster's features stored when the user confirms/dismisses it.
export interface RecurringFeedback {
  id: string;
  paymentId: string;
  isRecurring: boolean;
  description: string;
  amount: number;
  count: number;
  frequency: RecurringPayment['frequency'];
  intervals: number[];
  amountStdDev: number;
  lastDate: string; // ISO string
}

export interface UserSettings {
  monthlyIncomeTarget: number;
  savingsGoalPercent: number;
  currency: string;
  recurringConfidenceThreshold?: number; // minimum confidence to show recurring items (0-1)
}
