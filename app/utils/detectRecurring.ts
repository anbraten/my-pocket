import { RecurringModel } from '~/composables/recurring/model';
import type { Transaction, RecurringPayment } from '~/types';

// Tokens that appear across many different merchants and must not influence grouping.
// Without stripping these, "SEPA Lastschrift Rewe GmbH" and "SEPA Lastschrift Edeka GmbH"
// share 3 of 4 tokens and incorrectly merge into one recurring group.
const NOISE_TOKENS = new Set([
  'sepa', 'lastschrift', 'gutschrift', 'ueberweisung', 'abbuchung',
  'gmbh', 'co', 'kg', 'ag', 'se', 'bv', 'ab', 'sa', 'mbh', 'ev', 'eg', 'ltd', 'inc',
  'payment', 'zahlung', 'online',
]);

// Returns the fraction of the smaller token set covered by the larger (overlap coefficient).
// More robust than Jaccard when one description is a subset of another (e.g. "Rewe" vs "Rewe Markt Hamburg").
function merchantOverlap(a: string, b: string): number {
  const tokensA = new Set(a.split(' ').filter((t) => t.length >= 3 && !NOISE_TOKENS.has(t)));
  const tokensB = new Set(b.split(' ').filter((t) => t.length >= 3 && !NOISE_TOKENS.has(t)));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) if (tokensB.has(t)) intersection++;
  return intersection / Math.min(tokensA.size, tokensB.size);
}

const mlRecurring = new RecurringModel();

export function detectRecurringPayments(
  transactions: Transaction[],
): RecurringPayment[] {
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
      const similarity = merchantOverlap(normalizedDescription, existingMerchant);
      if (similarity < 0.7) continue;
      const groupAvgAbs =
        existingGroup.reduce((s, tx) => s + Math.abs(tx.amount), 0) /
        existingGroup.length;
      if (
        groupAvgAbs > 0 &&
        Math.abs(absAmount - groupAvgAbs) / groupAvgAbs > 0.1
      )
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
      (a, b) => a.date.getTime() - b.date.getTime(),
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
      amounts.reduce((s, a) => s + Math.pow(a - avgAmount, 2), 0) /
        amounts.length,
    );

    // Try each canonical period from shortest to longest; pick the first where
    // ≥75% of intervals fall within the allowed tolerance.
    const PERIODS: {
      days: number;
      freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
      tolerance: number;
    }[] = [
      { days: 1, freq: 'daily', tolerance: 0.5 },
      { days: 7, freq: 'weekly', tolerance: 0.3 },
      { days: 14, freq: 'weekly', tolerance: 0.25 }, // biweekly → weekly
      { days: 30, freq: 'monthly', tolerance: 0.25 }, // handles 28–31 day months
      { days: 365, freq: 'yearly', tolerance: 0.15 },
    ];

    let frequency: 'weekly' | 'monthly' | 'yearly' | 'daily';
    const detectedPeriod = PERIODS.find(
      ({ days, tolerance }) =>
        intervals.filter((i) => Math.abs(i - days) / days <= tolerance).length /
          intervals.length >=
        0.75,
    );

    if (detectedPeriod) {
      frequency = detectedPeriod.freq;
    } else {
      // Fallback: classify by median interval
      const sorted = [...intervals].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? avgInterval;
      if (median <= 2) frequency = 'daily';
      else if (median <= 10) frequency = 'weekly';
      else if (median <= 180) frequency = 'monthly';
      else frequency = 'yearly';
    }

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

    if (confidence < 0.3) continue;

    recurring.push({
      merchant: displayMerchant,
      amount: avgAmount,
      category: lastTxn.category ?? 'other',
      frequency,
      lastDate: lastTxn.date,
      nextExpectedDate: new Date(
        lastTxn.date.getTime() + avgInterval * 24 * 60 * 60 * 1000,
      ),
      intervals,
      count: sortedTransactions.length,
      transactionIds: sortedTransactions.map((t) => t.id),
      confidence: Math.min(1.0, confidence),
      amountStdDev,
    });
  }

  return recurring.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}
