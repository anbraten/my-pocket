export interface BankParser {
  name: string;
  delimiter: string;
  fileEncoding?: string;
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
