import { isValid, parse } from 'date-fns';

export const comdirectParser = {
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
    const cleaned = amountStr.replace(/[\s\.]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  },
};
