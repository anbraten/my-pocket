import { getSimilarity } from '~/utils/stringUtils';
import { RecurringModel } from '~/composables/recurring/model';
import type { Transaction, RecurringPayment } from '~/types';

const mlRecurring = new RecurringModel();

export function detectRecurringPayments(transactions: Transaction[]): RecurringPayment[] {
  const recurring: RecurringPayment[] = [];
  const merchantGroups = new Map<string, Transaction[]>();

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const niceStep = (raw: number) => {
    if (!Number.isFinite(raw) || raw <= 0) return 1;
    const exponent = Math.pow(10, Math.floor(Math.log10(raw)));
    const fraction = raw / exponent;
    const niceFraction =
      fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return niceFraction * exponent;
  };

  const getAmountBucket = (amountAbs: number) => {
    if (!Number.isFinite(amountAbs) || amountAbs <= 0) return 0;
    const rawStep = amountAbs * 0.015;
    const step = clamp(niceStep(rawStep), 0.25, 100);
    const bucket = Math.round(amountAbs / step) * step;
    return Number(bucket.toFixed(2));
  };

  for (const t of transactions) {
    const description = t.description ?? '';
    const normalizedDescription = description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\d{6,}/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const absAmount = Math.abs(t.amount);
    const amountBucket = getAmountBucket(absAmount);

    let matchedKey: string | null = null;
    for (const [existingKey, existingGroup] of merchantGroups.entries()) {
      const existingMerchant = existingKey.split('|')[0] ?? '';
      if (!existingMerchant) continue;
      const similarity = getSimilarity(normalizedDescription, existingMerchant);
      if (similarity <= 0.8) continue;
      const groupAvgAbs =
        existingGroup.reduce((s, tx) => s + Math.abs(tx.amount), 0) /
        existingGroup.length;
      if (groupAvgAbs > 0 && Math.abs(absAmount - groupAvgAbs) / groupAvgAbs > 0.1)
        continue;
      matchedKey = existingKey;
      break;
    }

    const key = matchedKey ?? `${normalizedDescription}|${amountBucket}`;
    if (!merchantGroups.has(key)) merchantGroups.set(key, []);
    merchantGroups.get(key)!.push(t);
  }

  for (const [merchant, groupTxns] of merchantGroups.entries()) {
    if (groupTxns.length < 2) continue;

    const firstTxn = groupTxns[0];
    if (!firstTxn) continue;

    const sortedTransactions = [...groupTxns].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    const intervals: number[] = [];
    for (let i = 1; i < sortedTransactions.length; i++) {
      const curr = sortedTransactions[i];
      const prev = sortedTransactions[i - 1];
      if (!curr || !prev) continue;
      const daysDiff =
        (curr.date.getTime() - prev.date.getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(daysDiff);
    }

    const avgInterval =
      intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

    const amounts = sortedTransactions.map((t) => t.amount);
    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const amountStdDev = Math.sqrt(
      amounts.reduce((s, a) => s + Math.pow(a - avgAmount, 2), 0) / amounts.length
    );

    let frequency: 'weekly' | 'monthly' | 'yearly' | 'daily';
    if (avgInterval <= 2) frequency = 'daily';
    else if (avgInterval <= 10) frequency = 'weekly';
    else if (avgInterval <= 45) frequency = 'monthly';
    else frequency = 'yearly';

    const lastTxn = sortedTransactions[sortedTransactions.length - 1];
    if (!lastTxn) continue;

    const displayMerchant = lastTxn.description.split('\n')[0] ?? merchant;

    const confidence = mlRecurring.predict({
      amount: avgAmount,
      frequency,
      intervals,
      count: sortedTransactions.length,
      merchant: displayMerchant,
      amountStdDev,
      lastDate: lastTxn.date.toISOString(),
    });

    if (confidence < 0.2) continue;

    recurring.push({
      merchant: displayMerchant,
      amount: avgAmount,
      category: lastTxn.category,
      frequency,
      lastDate: lastTxn.date,
      nextExpectedDate: new Date(
        lastTxn.date.getTime() + avgInterval * 24 * 60 * 60 * 1000
      ),
      intervals,
      count: sortedTransactions.length,
      confidence: Math.min(1.0, confidence),
      amountStdDev,
    });
  }

  return recurring.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}
