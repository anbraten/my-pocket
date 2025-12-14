import Papa from 'papaparse';
import { parseISO, parse, isValid } from 'date-fns';
import type { Transaction } from '~/types';

export interface CSVRow {
  [key: string]: string;
}

export type BankFormat = 'generic' | 'comdirect';

export interface BankParser {
  name: string;
  delimiter: string;
  skipFirstNLines: number;
  hasHeader: boolean;
  columns?: {
    date?: string;
    amount?: string;
    description?: string;
  };
  parseDescription?: (row: CSVRow) => string;
  parseDate?: (dateStr: string) => Date | null;
  parseAmount?: (amountStr: string) => number;
}

export const BANK_PARSERS: Record<BankFormat, BankParser> = {
  generic: {
    name: 'Generic CSV',
    delimiter: ',',
    skipFirstNLines: 0,
    hasHeader: true,
  },
  comdirect: {
    name: 'comdirect Bank',
    delimiter: ';',
    skipFirstNLines: 4,
    hasHeader: true,
    columns: {
      date: 'Buchungstag',
      amount: 'Umsatz in EUR',
      description: 'Buchungstext',
    },
    parseDescription: (row: CSVRow) => {
      // samples:
      // "11.12.2025";"11.12.2025";"Lastschrift / Belastung";"Auftraggeber: GC RE ENERGY PROVIDER GMBH Buchungstext: REF-11EE1EC588AA368F40 Ref. A72C21XM2L363OW1/63077";"-30,62";
      // "11.12.2025";"11.12.2025";"Übertrag / Überweisung";"Empfänger: Max Mustermann Kto/IBAN: DE65100123450000000001 BLZ/BIC: BANKDEFFXXX  Buchungstext: Depot top-up Ref. 0J2C21XN1ZMOGKJ2/11890";"-50,00";
      // "09.12.2025";"09.12.2025";"Kartenverfügung";" Buchungstext: Amazon.de*Z18913WA4, AMAZON.DE LU Karte Nr. 4871 78XX XXXX 9252 Kartenzahlung comdirect Visa-Debitkarte 2025-12-07 00:00:00 Ref. 452C21XL0ZG44V8F/15463";"-14,39";
      // "03.11.2025";"03.11.2025";"Lastschrift / Belastung";"Auftraggeber: Property Management GmbH Buchungstext: 1103756001061 6100073152 MIETE11/25 Ref. 2Z2C21SM0WIX08WV/43011";"-607,48";
      // "24.10.2025";"24.10.2025";"Lastschrift / Belastung";"Auftraggeber: congstar - eine Marke der Telekom Deutschland GmbH Buchungstext: congstar Kundennummer 0000000000 Rechnung 0000000000 Ref. 2C2C21SF25MX4DQG/43119";"-38,25";

      // Extract sender/receiver name and format the rest of the details
      const text = row['Buchungstext'] || '';
      if (!text) return 'Unknown';

      let name: string | undefined = '';
      const details: string[] = [];

      // Try to extract from "Auftraggeber:" (sender/payer)
      let match = text.match(/Auftraggeber:\s*(.+?)(?=\s*Buchungstext:|$)/);
      if (match) {
        name = match[1]?.trim();
      }

      // Try to extract from "Empfänger:" (receiver/payee)
      if (!name) {
        match = text.match(/Empfänger:\s*(.+?)(?=\s*Kto\/IBAN:|$)/);
        if (match) {
          name = match[1]?.trim();
        }
      }

      // For card transactions, extract merchant from Buchungstext
      if (!name && text.includes('Buchungstext:')) {
        match = text.match(/Buchungstext:\s*([^,]+)/);
        if (match) {
          name = match[1]?.trim();
        }
      }

      // Extract Buchungstext content for details
      match = text.match(/Buchungstext:\s*(.+?)(?=\s*Ref\.|$)/);
      if (match) {
        const buchungstext = match[1]?.trim() ?? '';
        // If we found a name (Auftraggeber/Empfänger), add full buchungstext to details
        if (name && !text.includes('Kartenverfügung')) {
          details.push(buchungstext);
        } else if (name) {
          // For card transactions, add additional info after merchant name
          const remainingInfo = buchungstext.substring(name.length).trim();
          if (remainingInfo && remainingInfo.startsWith(',')) {
            details.push(remainingInfo.substring(1).trim());
          } else if (remainingInfo) {
            details.push(remainingInfo);
          }
        }
      }

      // Extract Kto/IBAN if available
      match = text.match(/Kto\/IBAN:\s*([^\s]+)/);
      if (match) {
        details.push(`IBAN: ${match[1]?.trim()}`);
      }

      // Extract BLZ/BIC if available
      match = text.match(/BLZ\/BIC:\s*([^\s]+)/);
      if (match) {
        details.push(`BIC: ${match[1]?.trim()}`);
      }

      // Extract card number if available
      match = text.match(/Karte Nr\.\s*([\d\sX]+)/);
      if (match) {
        details.push(`Card: ${match[1]?.trim()}`);
      }

      // Extract transaction type/date if available (for card transactions)
      match = text.match(/Kartenzahlung\s+(.+?)\s+\d{4}-\d{2}-\d{2}/);
      if (match) {
        details.push(`Type: ${match[1]?.trim()}`);
      }

      // Extract Reference if available
      match = text.match(/Ref\.\s*([^\s]+)/);
      if (match) {
        details.push(`Ref: ${match[1]?.trim()}`);
      }

      // Fallback: use Vorgang if no name found
      if (!name) {
        const vorgang = row['Vorgang'];
        name = vorgang || 'Unknown';
      }

      // Format: First line is sender/receiver name, then details on separate lines
      return details.length > 0 ? `${name}\n${details.join('\n')}` : name;
    },
    parseDate: (dateStr: string) => {
      // comdirect uses dd.MM.yyyy format
      const parsed = parse(dateStr, 'dd.MM.yyyy', new Date());
      if (isValid(parsed)) return parsed;
      return null;
    },
    parseAmount: (amountStr: string) => {
      // comdirect uses comma as decimal separator
      const cleaned = amountStr.replace(/\s/g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    },
  },
};

export const parseCSV = (
  file: File,
  format: BankFormat = 'generic'
): Promise<CSVRow[]> => {
  const parser = BANK_PARSERS[format];
  // comdirect exports use ISO-8859-1 (Latin-1) encoding
  const encoding = format === 'comdirect' ? 'ISO-8859-1' : 'UTF-8';

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: parser.hasHeader,
      skipEmptyLines: true,
      delimiter: parser.delimiter,
      skipFirstNLines: parser.skipFirstNLines,
      encoding,
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
  parser: BankParser,
  categorize: (description: string) => any
): Omit<Transaction, 'id'>[] => {
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
