// Booking Date,Value Date,Partner Name,Partner Iban,Type,Payment Reference,Account Name,Amount (EUR),Original Amount,Original Currency,Exchange Rate
// ,,,,,,,,,,
// ,,,,,,,,,,
// 2026-01-01,2026-01-01,Coop SuperBrugsen Ring,,Presentment,,Main Account,-2.68,20,DKK,0.134
import { isValid, parse } from 'date-fns';
import type { BankParser } from '.';

export const n26Parser = {
  name: 'n26',
  delimiter: ',',
  skipFirstNLines: 4,
  hasHeader: true,
  columns: {
    date: 'Booking Date',
    amount: 'Amount (EUR)',
    description: 'Partner Name',
  },
  parseDescription: (row: CSVRow) => {
    const partner = row['Partner Name'] || '';
    const description = row['Payment Reference'] || '';

    return `${partner}\n${description}`;
  },
  parseDate: (dateStr: string) => {
    const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
    if (isValid(parsed)) return parsed;
    return null;
  },
  parseAmount: (amountStr: string) => {
    const cleaned = amountStr.replace(/[\s\.]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  },
} satisfies BankParser;
