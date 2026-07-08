import { describe, it, expect } from 'vitest';
import { comdirectParser } from '~/utils/parser/comdirect';
import { categorizeTransactionByKeywords } from './keywordAnalyzer';

// Full pipeline: comdirect CSV row → parseDescription → categorize
function categorize(buchungstext: string, vorgang = 'Lastschrift / Belastung') {
  const description = comdirectParser.parseDescription!({
    Buchungstext: buchungstext,
    Vorgang: vorgang,
  });
  return { category: categorizeTransactionByKeywords(description), description };
}

describe('category detection — comdirect pipeline', () => {
  it('card payment: Amazon → shopping', () => {
    const { category } = categorize(
      ' Buchungstext: Amazon.de*Z18913WA4, AMAZON.DE LU Karte Nr. 4871 78XX XXXX 9252 Kartenzahlung comdirect Visa-Debitkarte 2025-12-07 00:00:00 Ref. 452C21XL0ZG44V8F/15463',
      'Kartenverfügung',
    );
    expect(category).toBe('shopping');
  });

  it('Lastschrift: phone provider with Telekom in name → livelihood', () => {
    const { category } = categorize(
      'Auftraggeber: congstar - eine Marke der Telekom Deutschland GmbH Buchungstext: congstar Kundennummer 0000000000 Rechnung 0000000000 Ref. 2C2C21SF25MX4DQG/43119',
    );
    expect(category).toBe('livelihood');
  });

  it('Lastschrift: property management company → housing', () => {
    const { category } = categorize(
      'Auftraggeber: Property Management GmbH Buchungstext: 1103756001061 6100073152 MIETE11/25 Ref. 2Z2C21SM0WIX08WV/43011',
    );
    expect(category).toBe('housing');
  });

  it('Lastschrift: Hausverwaltung in name → housing', () => {
    const { category } = categorize(
      'Auftraggeber: Berliner Hausverwaltung GmbH Buchungstext: Miete Dez 2025 Ref. ABC123',
    );
    expect(category).toBe('housing');
  });

  it('card payment: REWE → groceries', () => {
    const { category } = categorize(
      ' Buchungstext: REWE SAGT DANKE, BERLIN DE Karte Nr. 4871 78XX XXXX 9252 Kartenzahlung comdirect Visa-Debitkarte 2025-12-05 00:00:00 Ref. XYZ',
      'Kartenverfügung',
    );
    expect(category).toBe('groceries');
  });

  it('card payment: Lidl → groceries', () => {
    const { category } = categorize(
      ' Buchungstext: Lidl Dienstleistung, NECKARSULM DE Karte Nr. 4871 78XX XXXX 9252 Kartenzahlung 2025-12-03 Ref. XYZ',
      'Kartenverfügung',
    );
    expect(category).toBe('groceries');
  });

  it('card payment: Deutsche Bahn → travel', () => {
    const { category } = categorize(
      ' Buchungstext: DB Vertrieb GmbH, FRANKFURT DE Karte Nr. 4871 78XX XXXX 9252 Kartenzahlung 2025-11-20 Ref. XYZ',
      'Kartenverfügung',
    );
    expect(category).toBe('travel');
  });

  it('card payment: Aral fuel → transportation', () => {
    const { category } = categorize(
      ' Buchungstext: Aral AG & Co. KG, BERLIN DE Karte Nr. 4871 78XX XXXX 9252 Kartenzahlung 2025-11-15 Ref. XYZ',
      'Kartenverfügung',
    );
    expect(category).toBe('transportation');
  });

  it('Lastschrift: Netflix → shopping', () => {
    const { category } = categorize(
      'Auftraggeber: Netflix International BV Buchungstext: Netflix Abo Ref. XYZ',
    );
    expect(category).toBe('shopping');
  });

  it('Lastschrift: abschlag in reference → livelihood', () => {
    // "Abschlag" (advance payment) almost always means a utility bill
    const { category } = categorize(
      'Auftraggeber: Stadtwerke Musterstadt GmbH Buchungstext: ABSCHLAG STROM APRIL 2026 Ref. XYZ',
    );
    expect(category).toBe('livelihood');
  });

  it('Lastschrift: rundfunk/GEZ → livelihood', () => {
    const { category } = categorize(
      'Auftraggeber: Beitragsservice von ARD, ZDF und Deutschlandradio Buchungstext: Rundfunkbeitrag Q2 2026 Ref. XYZ',
    );
    expect(category).toBe('livelihood');
  });

  it('Lastschrift: haftpflicht insurance → livelihood', () => {
    const { category } = categorize(
      'Auftraggeber: HUK-COBURG Versicherung Buchungstext: HAFTPFLICHT JAHRESBEITRAG 2026 Ref. XYZ',
    );
    expect(category).toBe('livelihood');
  });

  it('Lastschrift: kaution/deposit → housing', () => {
    const { category } = categorize(
      'Auftraggeber: Property Management GmbH Buchungstext: KAUTION WOHNUNG MUSTERSTRASSE 1 Ref. XYZ',
    );
    expect(category).toBe('housing');
  });

  it('Lastschrift: betriebskosten → housing', () => {
    const { category } = categorize(
      'Auftraggeber: Hausverwaltung Nord GmbH Buchungstext: BETRIEBSKOSTEN ABRECHNUNG 2025 Ref. XYZ',
    );
    expect(category).toBe('housing');
  });

  it('Lastschrift: sparplan → savings', () => {
    const { category } = categorize(
      'Auftraggeber: Scalable Capital GmbH Buchungstext: SPARPLAN ETF WORLD Ref. XYZ',
    );
    expect(category).toBe('savings');
  });

  it('Lastschrift: vermögenswirksame Leistungen → savings', () => {
    const { category } = categorize(
      'Auftraggeber: DWS Investment GmbH Buchungstext: VERMÖGENSWIRKSAME LEISTUNGEN 2026 Ref. XYZ',
    );
    expect(category).toBe('savings');
  });

  it('Gutschrift: kindergeld → income', () => {
    const { category } = categorize(
      'Auftraggeber: Familienkasse Bayern Buchungstext: KINDERGELD JANUAR 2026 Ref. XYZ',
      'Gutschrift',
    );
    expect(category).toBe('income');
  });

  it('Gutschrift: steuererstattung → income', () => {
    const { category } = categorize(
      'Auftraggeber: Finanzamt Musterstadt Buchungstext: STEUERERSTATTUNG 2025 Ref. XYZ',
      'Gutschrift',
    );
    expect(category).toBe('income');
  });

  it('Lastschrift: maut/toll → transportation', () => {
    const { category } = categorize(
      'Auftraggeber: Toll Collect GmbH Buchungstext: MAUT ABRECHNUNG MAERZ 2026 Ref. XYZ',
    );
    expect(category).toBe('transportation');
  });

  it('Lastschrift: ADAC membership → transportation', () => {
    const { category } = categorize(
      'Auftraggeber: ADAC SE Buchungstext: ADAC MITGLIEDSBEITRAG 2026 Ref. XYZ',
    );
    expect(category).toBe('transportation');
  });

  it('Lastschrift: vereinsbeitrag → leisure', () => {
    const { category } = categorize(
      'Auftraggeber: TSV Musterstadt 1888 e.V. Buchungstext: VEREINSBEITRAG QUARTAL 1 2026 Ref. XYZ',
    );
    expect(category).toBe('leisure');
  });

  it('card payment: Praxis → health', () => {
    const { category } = categorize(
      ' Buchungstext: Praxis Dr. Schmidt, BERLIN DE Karte Nr. 4871 78XX XXXX 9252 Kartenzahlung 2026-03-10 Ref. XYZ',
      'Kartenverfügung',
    );
    expect(category).toBe('health');
  });

  it('Überweisung: depot top-up → savings', () => {
    // "depot" keyword appears in the Buchungstext detail line, not the recipient name
    // Currently normalizeDescription only reads line 1 (the name), so this fails → 'other'
    // This test documents the gap: the buchungstext content on line 2 is ignored
    const { category, description } = categorize(
      'Empfänger: Max Mustermann Kto/IBAN: DE65100123450000000001 BLZ/BIC: BANKDEFFXXX  Buchungstext: Depot top-up Ref. 0J2C21XN1ZMOGKJ2/11890',
      'Übertrag / Überweisung',
    );
    // Line 2 contains "Depot top-up" but line 1 is just the person's name
    expect(description.split('\n')[1]).toContain('Depot top-up');
    expect(category).toBe('savings'); // fails until line-2 scanning is added
  });

  it('Lastschrift: energy provider GmbH → livelihood', () => {
    // "GC RE ENERGY PROVIDER GMBH" — none of the current keywords match
    // This test documents the gap: 'energy', 'strom', 'provider' are not in livelihood keywords
    const { category } = categorize(
      'Auftraggeber: GC RE ENERGY PROVIDER GMBH Buchungstext: REF-11EE1EC588AA368F40 Ref. A72C21XM2L363OW1/63077',
    );
    expect(category).toBe('livelihood'); // fails until 'energy' keyword is added
  });
});
