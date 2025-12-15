import Papa from 'papaparse';
import { parseISO, parse, isValid } from 'date-fns';
import type { Transaction } from '~/types';
import { comdirectParser } from './parser/comdirect';
import type { BankParser } from './parser';

export interface CSVRow {
  [key: string]: string;
}

export const BANK_PARSERS: Record<string, BankParser> = {
  generic: {
    name: 'Generic CSV',
    delimiter: ',',
    skipFirstNLines: 0,
    hasHeader: true,
  },
  comdirect: comdirectParser,
};

export const parseCSV = (
  file: File,
  parserNamer = 'generic'
): Promise<CSVRow[]> => {
  const parser = BANK_PARSERS[parserNamer];
  if (!parser) {
    throw new Error(`Unsupported bank format: ${parserNamer}`);
  }

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: parser.hasHeader,
      skipEmptyLines: true,
      delimiter: parser.delimiter,
      skipFirstNLines: parser.skipFirstNLines,
      encoding: parser.fileEncoding,
      complete: (results) => {
        resolve(results.data as CSVRow[]);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

// Detect which columns contain date, amount, and description
export const detectColumns = (
  rows: CSVRow[]
): {
  dateColumn: string | null;
  amountColumn: string | null;
  descriptionColumn: string | null;
} => {
  if (rows.length === 0)
    return { dateColumn: null, amountColumn: null, descriptionColumn: null };

  const headers = Object.keys(rows[0] ?? {});

  // Common date column names
  const datePatterns = [
    'date',
    'transaction date',
    'posted date',
    'datetime',
    'time',
    'buchungstag',
  ];
  const dateColumn =
    headers.find((h) =>
      datePatterns.some((p) => h.toLowerCase().includes(p))
    ) || null;

  // Common amount column names
  const amountPatterns = [
    'amount',
    'debit',
    'credit',
    'value',
    'total',
    'sum',
    'umsatz',
  ];
  const amountColumn =
    headers.find((h) =>
      amountPatterns.some((p) => h.toLowerCase().includes(p))
    ) || null;

  // Common description column names
  const descPatterns = [
    'description',
    'merchant',
    'name',
    'memo',
    'details',
    'payee',
    'buchungstext',
  ];
  const descriptionColumn =
    headers.find((h) =>
      descPatterns.some((p) => h.toLowerCase().includes(p))
    ) || null;

  return { dateColumn, amountColumn, descriptionColumn };
};

// Parse date from various formats
export const parseDate = (dateStr: string): Date | null => {
  try {
    // Try ISO format first
    const isoDate = parseISO(dateStr);
    if (isValid(isoDate)) return isoDate;
  } catch {}

  // Try common formats
  const formats = [
    'MM/dd/yyyy',
    'dd/MM/yyyy',
    'yyyy-MM-dd',
    'MM-dd-yyyy',
    'dd-MM-yyyy',
    'dd.MM.yyyy',
    'MM.dd.yyyy',
    'yyyy.MM.dd',
  ];

  for (const format of formats) {
    try {
      const parsed = parse(dateStr, format, new Date());
      if (isValid(parsed)) return parsed;
    } catch {
      continue;
    }
  }

  return null;
};

// Parse amount (handle negative, currency symbols, etc)
export const parseAmount = (amountStr: string): number => {
  // Remove currency symbols and spaces
  let cleaned = amountStr.replace(/[$€£¥\s]/g, '');

  // Handle parentheses for negative (accounting format)
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }

  const unifyDecimalSeparator = (str: string): string => {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');

    // If comma comes after dot, comma is the decimal separator
    if (lastComma > lastDot) {
      return str.replace(/\./g, '').replace(/,/g, '.');
    }

    // Otherwise, just remove commas (dot is decimal or no decimals)
    return str.replace(/,/g, '');
  };
  cleaned = unifyDecimalSeparator(cleaned);

  return parseFloat(cleaned) || 0;
};

// Convert CSV rows to transactions
export const csvToTransactions = (
  rows: CSVRow[],
  parserNamer: string,
  categorize: (description: string) => any
): Omit<Transaction, 'id'>[] => {
  const parser = BANK_PARSERS[parserNamer];
  if (!parser) {
    throw new Error(`Unsupported bank format: ${parserNamer}`);
  }

  let dateColumn = parser.columns?.date ?? null;
  let amountColumn = parser.columns?.amount ?? null;
  let descriptionColumn = parser.columns?.description ?? null;

  // Auto-detect columns for generic format
  if (!dateColumn || !amountColumn || !descriptionColumn) {
    const columns = detectColumns(rows);
    dateColumn = dateColumn ?? columns.dateColumn;
    amountColumn = amountColumn ?? columns.amountColumn;
    descriptionColumn = descriptionColumn ?? columns.descriptionColumn;
  }

  if (!dateColumn || !amountColumn || !descriptionColumn) {
    throw new Error('Could not detect necessary columns in CSV data.');
  }

  return rows
    .map((row) => {
      const dateStr = row[dateColumn] || '';
      const amountStr = row[amountColumn] || '0';

      // Use custom description parser if available
      const description = parser.parseDescription
        ? parser.parseDescription(row)
        : row[descriptionColumn] || 'Unknown';

      // Use custom date parser if available
      const date = parser.parseDate
        ? parser.parseDate(dateStr)
        : parseDate(dateStr);

      // Use custom amount parser if available
      const amount = parser.parseAmount
        ? parser.parseAmount(amountStr)
        : parseAmount(amountStr);

      const category = categorize(description);

      // Extract merchant name from first line or first few words
      const firstLine = description.split('\n')[0] || description;
      const merchant = firstLine.split(' ').slice(0, 3).join(' ');

      return {
        date,
        amount,
        description,
        category,
        merchant,
      };
    })
    .filter((t) => t.date !== null && t.amount !== 0) as Omit<
    Transaction,
    'id'
  >[];
};
