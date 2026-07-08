import { describe, it, expect } from 'vitest';
import { comdirectParser } from './comdirect';

// Helper to call parseDescription with a raw CSV row
function parse(buchungstext: string, vorgang = '') {
  return comdirectParser.parseDescription!({ Buchungstext: buchungstext, Vorgang: vorgang });
}

describe('comdirectParser.parseDescription', () => {
  it('extracts Auftraggeber name for Lastschrift', () => {
    const result = parse(
      'Auftraggeber: GC RE ENERGY PROVIDER GMBH Buchungstext: REF-11EE1EC588AA368F40 Ref. A72C21XM2L363OW1/63077',
    );
    expect(result.split('\n')[0]).toBe('GC RE ENERGY PROVIDER GMBH');
  });

  it('extracts Empfänger name and IBAN for Überweisung', () => {
    const result = parse(
      'Empfänger: Max Mustermann Kto/IBAN: DE65100123450000000001 BLZ/BIC: BANKDEFFXXX  Buchungstext: Depot top-up Ref. 0J2C21XN1ZMOGKJ2/11890',
    );
    const lines = result.split('\n');
    expect(lines[0]).toBe('Max Mustermann');
    expect(lines.some((l) => l.includes('DE65100123450000000001'))).toBe(true);
  });

  it('extracts merchant name for Kartenverfügung', () => {
    const result = parse(
      ' Buchungstext: Amazon.de*Z18913WA4, AMAZON.DE LU Karte Nr. 4871 78XX XXXX 9252 Kartenzahlung comdirect Visa-Debitkarte 2025-12-07 00:00:00 Ref. 452C21XL0ZG44V8F/15463',
    );
    expect(result.split('\n')[0]).toBe('Amazon.de*Z18913WA4');
  });

  it('extracts Auftraggeber for rent payment with MIETE in Buchungstext', () => {
    const result = parse(
      'Auftraggeber: Property Management GmbH Buchungstext: 1103756001061 6100073152 MIETE11/25 Ref. 2Z2C21SM0WIX08WV/43011',
    );
    const lines = result.split('\n');
    expect(lines[0]).toBe('Property Management GmbH');
    expect(lines[1]).toContain('MIETE11/25');
  });

  it('extracts Auftraggeber for phone bill', () => {
    const result = parse(
      'Auftraggeber: congstar - eine Marke der Telekom Deutschland GmbH Buchungstext: congstar Kundennummer 0000000000 Rechnung 0000000000 Ref. 2C2C21SF25MX4DQG/43119',
    );
    expect(result.split('\n')[0]).toBe(
      'congstar - eine Marke der Telekom Deutschland GmbH',
    );
  });

  it('falls back to Vorgang when no name can be extracted', () => {
    const result = parse('', 'Lastschrift / Belastung');
    expect(result).toBe('Lastschrift / Belastung');
  });
});

describe('comdirectParser.parseAmount', () => {
  it('parses German decimal format', () => {
    expect(comdirectParser.parseAmount!('-30,62')).toBeCloseTo(-30.62);
    expect(comdirectParser.parseAmount!('-607,48')).toBeCloseTo(-607.48);
    expect(comdirectParser.parseAmount!('1.234,56')).toBeCloseTo(1234.56);
  });
});

describe('comdirectParser.parseDate', () => {
  it('parses dd.MM.yyyy format', () => {
    const date = comdirectParser.parseDate!('11.12.2025');
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2025);
    expect(date!.getMonth()).toBe(11); // 0-indexed
    expect(date!.getDate()).toBe(11);
  });

  it('returns null for invalid dates', () => {
    expect(comdirectParser.parseDate!('not-a-date')).toBeNull();
  });
});
