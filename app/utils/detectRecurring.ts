import { RecurringModel } from '~/composables/recurring/model';
import type { Transaction, RecurringPayment } from '~/types';

export function fnv1a(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const BANK_PREFIX_PATTERNS = [
  /^sepa\s+lastschrift\s*/,
  /^kartenzahlung\s*/,
  /^paypal\s*\*\s*/,
  /^ec\s+/,
  /^visa\s+/,
  /^lastschrift\s*/,
  /^gutschrift\s*/,
  /^ueberweisung\s*/,
  /^abbuchung\s*/,
];

const STRIP_TOKENS = new Set([
  'gmbh',
  'co',
  'kg',
  'ag',
  'se',
  'bv',
  'ab',
  'sa',
  'mbh',
  'ev',
  'eg',
  'ltd',
  'inc',
  'llc',
  'plc',
  'nv',
  'sl',
  'payment',
  'zahlung',
  'online',
  'ref',
]);

const LOCATION_WORDS = new Set([
  'amsterdam',
  'berlin',
  'hamburg',
  'munich',
  'frankfurt',
  'cologne',
  'stuttgart',
  'dusseldorf',
  'dortmund',
  'essen',
  'leipzig',
  'bremen',
  'dresden',
  'hannover',
  'nuremberg',
  'london',
  'paris',
  'madrid',
  'luxembourg',
  'vienna',
  'zurich',
  'dublin',
  'de',
  'uk',
  'fr',
  'nl',
  'at',
  'ch',
  'internet',
  'www',
  'shop',
]);

export function extractDescriptionCore(description: string): string {
  let s = description.toLowerCase();

  for (const re of BANK_PREFIX_PATTERNS) {
    s = s.replace(re, '');
  }

  s = s.replace(/[^a-z0-9\s]/g, ' ');
  s = s.replace(/\b\d+\b/g, ' ');

  const tokens = s.split(/\s+/).filter((t) => {
    if (t.length < 2) return false;
    if (STRIP_TOKENS.has(t)) return false;
    if (LOCATION_WORDS.has(t)) return false;
    if (/\d/.test(t)) return false; // drop mixed alphanumeric tokens (refs, codes like "miete11", "2z2c21sm")
    return true;
  });

  return tokens.join(' ').trim();
}

function buildTrigrams(s: string): Set<string> {
  const result = new Set<string>();
  for (let i = 0; i <= s.length - 3; i++) {
    result.add(s.slice(i, i + 3));
  }
  return result;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]!);
    return this.parent[x]!;
  }

  union(x: number, y: number): void {
    const px = this.find(x);
    const py = this.find(y);
    if (px === py) return;
    if (this.rank[px]! < this.rank[py]!) this.parent[px] = py;
    else if (this.rank[px]! > this.rank[py]!) this.parent[py] = px;
    else {
      this.parent[py] = px;
      this.rank[px]!++;
    }
  }
}

export function clusterByTrigrams(
  transactions: Transaction[],
): Map<number, Transaction[]> {
  const cores = transactions.map((t) =>
    extractDescriptionCore(t.description ?? ''),
  );
  const unique = [...new Set(cores)];
  const trigramSets = unique.map(buildTrigrams);

  const uf = new UnionFind(unique.length);

  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      if (jaccard(trigramSets[i]!, trigramSets[j]!) >= 0.5) {
        uf.union(i, j);
      }
    }
  }

  const coreToIdx = new Map<string, number>();
  unique.forEach((core, i) => coreToIdx.set(core, i));

  const clusters = new Map<number, Transaction[]>();
  for (let ti = 0; ti < transactions.length; ti++) {
    const core = cores[ti]!;
    const idx = coreToIdx.get(core) ?? 0;
    const root = uf.find(idx);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(transactions[ti]!);
  }

  return clusters;
}

const PERIODS: {
  days: number;
  freq: RecurringPayment['frequency'];
  tolerance: number;
}[] = [
  { days: 1, freq: 'daily', tolerance: 0.5 },
  { days: 7, freq: 'weekly', tolerance: 0.3 },
  { days: 14, freq: 'biweekly', tolerance: 0.25 },
  { days: 30, freq: 'monthly', tolerance: 0.25 },
  { days: 91, freq: 'quarterly', tolerance: 0.2 },
  { days: 365, freq: 'yearly', tolerance: 0.15 },
];

export function analyzeCluster(
  txns: Transaction[],
  model: RecurringModel,
): RecurringPayment | null {
  if (txns.length < 2) return null;

  const sorted = [...txns].sort((a, b) => a.date.getTime() - b.date.getTime());

  const rawIntervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    rawIntervals.push(
      (sorted[i]!.date.getTime() - sorted[i - 1]!.date.getTime()) / 86_400_000,
    );
  }

  // Fill gaps larger than 1.8× median with equal sub-intervals
  const sortedRaw = [...rawIntervals].sort((a, b) => a - b);
  const rawMedian = sortedRaw[Math.floor(sortedRaw.length / 2)] ?? 1;

  const intervals: number[] = [];
  for (const iv of rawIntervals) {
    if (rawMedian > 0 && iv > rawMedian * 1.8) {
      const n = Math.round(iv / rawMedian);
      const sub = iv / n;
      for (let k = 0; k < n; k++) intervals.push(sub);
    } else {
      intervals.push(iv);
    }
  }

  const avgInterval = intervals.reduce((s, i) => s + i, 0) / intervals.length;

  const amounts = sorted.map((t) => t.amount);
  const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const amountStdDev = Math.sqrt(
    amounts.reduce((s, a) => s + (a - avgAmount) ** 2, 0) / amounts.length,
  );

  const detectedPeriod = PERIODS.find(
    ({ days, tolerance }) =>
      intervals.filter((i) => Math.abs(i - days) / days <= tolerance).length /
        intervals.length >=
      0.75,
  );

  let frequency: RecurringPayment['frequency'];
  if (detectedPeriod) {
    frequency = detectedPeriod.freq;
  } else {
    const m =
      [...intervals].sort((a, b) => a - b)[Math.floor(intervals.length / 2)] ??
      avgInterval;
    if (m <= 2) frequency = 'daily';
    else if (m <= 10) frequency = 'weekly';
    else if (m <= 21) frequency = 'biweekly';
    else if (m <= 60) frequency = 'monthly';
    else if (m <= 180) frequency = 'quarterly';
    else frequency = 'yearly';
  }

  const lastTxn = sorted[sorted.length - 1]!;

  const confidence = model.predict({
    description: '',
    amount: avgAmount,
    count: sorted.length,
    frequency,
    intervals,
    amountStdDev,
    lastDate: lastTxn.date.toISOString(),
  });

  if (confidence < 0.5) return null;

  // Display name: mode of the first line of description across transactions
  const nameCounts = new Map<string, number>();
  for (const tx of sorted) {
    const name = tx.description.split('\n')[0] ?? '';
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  const description =
    [...nameCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    sorted[0]!.description;

  return {
    id: fnv1a(extractDescriptionCore(description)),
    description: description,
    amount: lastTxn.amount,
    category: lastTxn.category ?? 'other',
    frequency,
    lastDate: lastTxn.date,
    nextExpectedDate: new Date(
      lastTxn.date.getTime() + avgInterval * 86_400_000,
    ),
    transactionIds: sorted.map((t) => t.id),
    intervals,
    confidence,
    amountStdDev,
  };
}

// Split a cluster into sub-groups where each transaction's amount is within
// 25% of the sub-group's running average. This separates e.g. Amazon Prime
// (always ~€8.99) from Amazon shopping (variable €15–€100).
function subclusterByAmount(txns: Transaction[]): Transaction[][] {
  const sorted = [...txns].sort(
    (a, b) => Math.abs(a.amount) - Math.abs(b.amount),
  );
  const subclusters: { avg: number; txns: Transaction[] }[] = [];

  for (const tx of sorted) {
    const absAmt = Math.abs(tx.amount);
    const match = subclusters.find(({ avg }) => {
      const absAvg = Math.abs(avg);
      return absAvg === 0
        ? absAmt < 1
        : Math.abs(absAmt - absAvg) / absAvg <= 0.25;
    });

    if (match) {
      match.txns.push(tx);
      match.avg =
        match.txns.reduce((s, t) => s + t.amount, 0) / match.txns.length;
    } else {
      subclusters.push({ avg: tx.amount, txns: [tx] });
    }
  }

  return subclusters.map((sc) => sc.txns);
}

export function detectRecurringPayments(
  transactions: Transaction[],
  model?: RecurringModel,
): RecurringPayment[] {
  const effectiveModel = model ?? new RecurringModel();
  const clusters = clusterByTrigrams(transactions);
  const results: RecurringPayment[] = [];

  for (const txns of clusters.values()) {
    for (const sub of subclusterByAmount(txns)) {
      const payment = analyzeCluster(sub, effectiveModel);
      if (payment) results.push(payment);
    }
  }

  return results.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}
