// ﻿Bezeichnung Auftragskonto;IBAN Auftragskonto;BIC Auftragskonto;Bankname Auftragskonto;Buchungstag;Valutadatum;Name Zahlungsbeteiligter;IBAN Zahlungsbeteiligter;BIC (SWIFT-Code) Zahlungsbeteiligter;Buchungstext;Verwendungszweck;Betrag;Waehrung;Saldo nach Buchung;Bemerkung;Gekennzeichneter Umsatz;Glaeubiger ID;Mandatsreferenz
import { isValid, parse } from 'date-fns';
import type { BankParser } from '.';

export const spardaParser = {
  name: 'sparda',
  delimiter: ';',
  skipFirstNLines: 4,
  hasHeader: true,
  columns: {
    date: 'Buchungstag',
    amount: 'Betrag',
    description: 'Verwendungszweck',
  },
  // parseDescription: (row: CSVRow) => {
  //   row.['Buchungstext'] = row['Buchungstext']?.replace(/\s+/g, ' ').trim() || '';
  // },
  parseDate: (dateStr: string) => {
    const parsed = parse(dateStr, 'dd.MM.yyyy', new Date());
    if (isValid(parsed)) return parsed;
    return null;
  },
  parseAmount: (amountStr: string) => {
    const cleaned = amountStr.replace(/[\s\.]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  },
} satisfies BankParser;
