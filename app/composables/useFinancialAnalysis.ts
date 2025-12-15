import { endOfMonth, startOfMonth, differenceInDays } from 'date-fns';
import type { Transaction, Category, RecurringPayment } from '~/types';

export interface FinancialInsight {
  id: string;
  type: 'progress' | 'subscription' | 'budget' | 'anomaly' | 'opportunity';
  severity: 'success' | 'info' | 'warning' | 'danger';
  title: string;
  description: string;
  action?: string;
  amount?: number;
  category?: Category;
}

export interface MonthProgress {
  daysElapsed: number;
  daysTotal: number;
  percentElapsed: number;
  expectedSpending: number;
  actualSpending: number;
  isOnTrack: boolean;
  projectedEndOfMonth: number;
}

export interface BudgetRecommendation {
  hasRoomForDinner: boolean;
  dinnerBudget: number;
  savingsOpportunity: number;
  canSaveInETF: boolean;
  recommendation: string;
}

export interface AnomalyDetection {
  transaction: Transaction;
  type: 'large_expense' | 'unusual_income' | 'irregular_spending';
  deviation: number;
  description: string;
}

export const useFinancialAnalysis = () => {
  const { monthlyExpenses, monthlyIncome, detectRecurringPayments } =
    useTransactions();

  // Calculate current month progress
  const monthProgress = computed((): MonthProgress => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const daysElapsed = differenceInDays(now, monthStart) + 1;
    const daysTotal = differenceInDays(monthEnd, monthStart) + 1;
    const percentElapsed = daysElapsed / daysTotal;

    const totalIncome = monthlyIncome.value.reduce(
      (sum, t) => sum + t.amount,
      0
    );
    const totalSpending = Math.abs(
      monthlyExpenses.value.reduce((sum, t) => sum + t.amount, 0)
    );

    // Expected spending should be proportional to days elapsed
    const expectedSpending = totalIncome * percentElapsed * 0.8; // Assume 80% of income should cover expenses

    const isOnTrack = totalSpending <= expectedSpending;

    // Project end of month spending
    const projectedEndOfMonth = totalSpending / percentElapsed;

    return {
      daysElapsed,
      daysTotal,
      percentElapsed,
      expectedSpending,
      actualSpending: totalSpending,
      isOnTrack,
      projectedEndOfMonth,
    };
  });

  // Detect anomalous transactions
  const detectAnomalies = computed((): AnomalyDetection[] => {
    const anomalies: AnomalyDetection[] = [];
    const monthTransactions = [
      ...monthlyExpenses.value,
      ...monthlyIncome.value,
    ];

    // Calculate stats for expenses
    const expenseAmounts = monthlyExpenses.value.map((t) => Math.abs(t.amount));
    const expenseAvg =
      expenseAmounts.reduce((sum, a) => sum + a, 0) / expenseAmounts.length ||
      0;
    const expenseStdDev = Math.sqrt(
      expenseAmounts.reduce((sum, a) => sum + Math.pow(a - expenseAvg, 2), 0) /
        expenseAmounts.length || 1
    );

    // Detect large expenses (>2 standard deviations)
    for (const transaction of monthlyExpenses.value) {
      const amount = Math.abs(transaction.amount);
      if (amount > expenseAvg + 2 * expenseStdDev && amount > 200) {
        anomalies.push({
          transaction,
          type: 'large_expense',
          deviation: (amount - expenseAvg) / expenseStdDev,
          description: `Unusually large ${transaction.category} expense`,
        });
      }
    }

    // Detect unusual income (like gifts, bonuses)
    for (const transaction of monthlyIncome.value) {
      const amount = transaction.amount;
      const isGift =
        transaction.description.toLowerCase().includes('gift') ||
        transaction.description.toLowerCase().includes('bonus') ||
        transaction.description.toLowerCase().includes('refund');

      if (isGift || amount > 500) {
        anomalies.push({
          transaction,
          type: 'unusual_income',
          deviation: 0,
          description: `Unexpected income: ${transaction.description}`,
        });
      }
    }

    return anomalies.sort(
      (a, b) => Math.abs(b.transaction.amount) - Math.abs(a.transaction.amount)
    );
  });

  // Analyze recurring transactions (expenses and income)
  const analyzeRecurring = computed(() => {
    const payments = detectRecurringPayments();

    // Get recurring income to use as the budget baseline
    const recurringIncome = payments.filter((p) => p.amount > 0);
    const recurringExpenses = payments.filter((p) => p.amount < 0);

    const normalizeToMonthly = (payment: RecurringPayment) => {
      const baseAmount = (() => {
        if (payment.frequency === 'weekly') return (payment.amount * 52) / 12;
        if (payment.frequency === 'yearly') return payment.amount / 12;
        return payment.amount;
      })();
      // Return absolute value for all amounts
      return Math.abs(baseAmount);
    };

    // Calculate total recurring income
    const totalRecurringIncome = recurringIncome.reduce(
      (sum, p) => sum + normalizeToMonthly(p),
      0
    );

    const recurring = payments.map((payment) => ({
      ...payment,
      monthlyAmount: normalizeToMonthly(payment),
      percentOfIncome:
        totalRecurringIncome > 0
          ? (normalizeToMonthly(payment) / totalRecurringIncome) * 100
          : 0,
      isEssential: ['utilities', 'health', 'transport'].includes(
        payment.category
      ),
    }));

    // Only count expenses for totalMonthly (use absolute values)
    const expenseRecurringData = recurring.filter((r) => r.amount < 0);
    const totalMonthly = expenseRecurringData.reduce(
      (sum, s) => sum + s.monthlyAmount,
      0
    );
    const essentialTotal = expenseRecurringData
      .filter((s) => s.isEssential)
      .reduce((sum, s) => sum + s.monthlyAmount, 0);
    const nonEssentialTotal = totalMonthly - essentialTotal;

    // Find cancellation candidates (non-essential, expensive expenses only)
    const cancellationCandidates = expenseRecurringData
      .filter((s) => !s.isEssential && s.category === 'entertainment')
      .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
      .slice(0, 3);

    return {
      recurring,
      totalMonthly,
      essentialTotal,
      nonEssentialTotal,
      recurringIncome: totalRecurringIncome,
      percentOfIncome:
        totalRecurringIncome > 0
          ? (totalMonthly / totalRecurringIncome) * 100
          : 0,
      cancellationCandidates,
      potentialSavings: cancellationCandidates.reduce(
        (sum, s) => sum + s.monthlyAmount,
        0
      ),
    };
  });

  // Budget recommendations
  const budgetRecommendation = computed((): BudgetRecommendation => {
    const totalIncome = monthlyIncome.value.reduce(
      (sum, t) => sum + t.amount,
      0
    );
    const totalSpending = Math.abs(
      monthlyExpenses.value.reduce((sum, t) => sum + t.amount, 0)
    );
    const recurring = analyzeRecurring.value.totalMonthly;

    const progress = monthProgress.value;
    const daysRemaining = progress.daysTotal - progress.daysElapsed;
    const remainingBudget = totalIncome * 0.8 - totalSpending; // 80% of income for expenses, 20% for savings
    const dailyBudget = remainingBudget / daysRemaining;

    // Typical dinner cost
    const dinnerCost = 60;
    const hasRoomForDinner = dailyBudget > dinnerCost;

    // Calculate savings opportunity
    const projectedSavings =
      totalIncome - progress.projectedEndOfMonth - recurring;
    const canSaveInETF = projectedSavings > 100;

    let recommendation = '';
    if (hasRoomForDinner && canSaveInETF) {
      recommendation = `You're doing great! You can enjoy a dinner (${dailyBudget.toFixed(
        0
      )}/day available) and still save ~${projectedSavings.toFixed(
        0
      )} for investments.`;
    } else if (hasRoomForDinner && !canSaveInETF) {
      recommendation = `You can afford a dinner, but savings are tight. Consider skipping to build your ETF fund.`;
    } else if (!hasRoomForDinner && projectedSavings > 0) {
      recommendation = `Budget is tight for discretionary spending. Save the ${projectedSavings.toFixed(
        0
      )} and skip the dinner this time.`;
    } else {
      recommendation = `You're overspending. Cut back on non-essentials to avoid going into the red.`;
    }

    return {
      hasRoomForDinner,
      dinnerBudget: Math.max(0, dailyBudget),
      savingsOpportunity: Math.max(0, projectedSavings),
      canSaveInETF,
      recommendation,
    };
  });

  // Generate comprehensive insights
  const generateConsultantInsights = computed((): FinancialInsight[] => {
    const insights: FinancialInsight[] = [];
    const progress = monthProgress.value;
    const budget = budgetRecommendation.value;
    const subs = analyzeRecurring.value;
    const anomalies = detectAnomalies.value;

    // Month progress insight
    if (progress.isOnTrack) {
      insights.push({
        id: 'progress-good',
        type: 'progress',
        severity: 'success',
        title: "📊 You're on track this month",
        description: `${
          progress.daysElapsed
        } days in, you've spent ${progress.actualSpending.toFixed(
          0
        )} vs expected ${progress.expectedSpending.toFixed(0)}. Keep it up!`,
      });
    } else {
      const overspending = progress.actualSpending - progress.expectedSpending;
      insights.push({
        id: 'progress-warning',
        type: 'progress',
        severity: 'warning',
        title: '⚠️ Spending ahead of schedule',
        description: `You're ${overspending.toFixed(
          0
        )} over where you should be at day ${
          progress.daysElapsed
        }. Projected to spend ${progress.projectedEndOfMonth.toFixed(
          0
        )} by month end.`,
        action: 'Consider reducing discretionary spending',
        amount: overspending,
      });
    }

    // Dinner budget insight
    if (budget.hasRoomForDinner) {
      insights.push({
        id: 'dinner-yes',
        type: 'budget',
        severity: 'success',
        title: '🍽️ Yes, go enjoy that dinner!',
        description: `You have ${budget.dinnerBudget.toFixed(
          0
        )}/day available. A nice dinner with your girlfriend fits comfortably in your budget.`,
      });
    } else {
      insights.push({
        id: 'dinner-no',
        type: 'budget',
        severity: 'warning',
        title: '🍽️ Budget is tight for dining out',
        description: `Only ${budget.dinnerBudget.toFixed(
          0
        )}/day remaining. Consider a home-cooked meal instead to stay on track.`,
        action: 'Cook at home this time',
      });
    }

    // Savings opportunity
    if (budget.canSaveInETF) {
      insights.push({
        id: 'savings-opportunity',
        type: 'opportunity',
        severity: 'success',
        title: '💰 Extra money for ETF investments',
        description: `You're projected to have ${budget.savingsOpportunity.toFixed(
          0
        )} left over. Perfect for your investment portfolio!`,
        action: 'Set up automatic ETF purchase',
        amount: budget.savingsOpportunity,
      });
    }

    // Subscription recommendations
    if (
      subs.cancellationCandidates.length > 0 &&
      subs.nonEssentialTotal > 100
    ) {
      const topCandidate = subs.cancellationCandidates[0];
      if (topCandidate) {
        insights.push({
          id: 'subscription-review',
          type: 'subscription',
          severity: 'info',
          title: '📱 Review entertainment expenses',
          description: `${
            topCandidate.merchant
          } costs ${topCandidate.monthlyAmount.toFixed(0)}/mo. You have ${
            subs.recurring.length
          } recurring items totaling ${subs.totalMonthly.toFixed(0)}/mo.`,
          action: `Cancel unused services to save ${subs.potentialSavings.toFixed(
            0
          )}/mo`,
          amount: subs.potentialSavings,
          category: 'entertainment',
        });
      }
    }

    // Anomaly insights
    for (const anomaly of anomalies.slice(0, 2)) {
      if (anomaly.type === 'large_expense') {
        insights.push({
          id: `anomaly-${anomaly.transaction.id}`,
          type: 'anomaly',
          severity: 'info',
          title: `💸 Unusual ${anomaly.transaction.category} expense`,
          description: `${Math.abs(anomaly.transaction.amount).toFixed(0)} at ${
            anomaly.transaction.description
          } - much higher than your typical ${
            anomaly.transaction.category
          } spending.`,
          amount: Math.abs(anomaly.transaction.amount),
          category: anomaly.transaction.category,
        });
      } else if (anomaly.type === 'unusual_income') {
        insights.push({
          id: `anomaly-${anomaly.transaction.id}`,
          type: 'anomaly',
          severity: 'success',
          title: `🎁 Unexpected income received`,
          description: `${anomaly.transaction.amount.toFixed(0)} from ${
            anomaly.transaction.description
          }. Consider saving or investing this windfall!`,
          amount: anomaly.transaction.amount,
        });
      }
    }

    return insights;
  });

  // Work progress analysis (are you earning enough?)
  const workProgress = computed(() => {
    const totalIncome = monthlyIncome.value.reduce(
      (sum, t) => sum + t.amount,
      0
    );
    const progress = monthProgress.value;

    // Expected income based on typical monthly income (you can make this dynamic)
    const expectedMonthlyIncome = 3000; // This should ideally come from user settings or historical average
    const expectedIncomeAtThisPoint =
      expectedMonthlyIncome * progress.percentElapsed;

    const isEarningEnough = totalIncome >= expectedIncomeAtThisPoint;
    const incomeGap = expectedIncomeAtThisPoint - totalIncome;

    return {
      totalIncome,
      expectedIncome: expectedMonthlyIncome,
      expectedAtThisPoint: expectedIncomeAtThisPoint,
      isEarningEnough,
      incomeGap,
      needsMoreWork: incomeGap > 100,
    };
  });

  return {
    monthProgress,
    detectAnomalies,
    analyzeRecurring,
    budgetRecommendation,
    generateConsultantInsights,
    workProgress,
  };
};
