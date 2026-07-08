import { describe, it, expect } from 'vitest';
import {
  normalizeDescription,
  categorizeTransactionByKeywords,
} from './keywordAnalyzer';

describe('normalizeDescription', () => {
  it('lowercases and includes first two lines', () => {
    // Line 1 = merchant name, line 2 = buchungstext content (both useful for matching)
    expect(normalizeDescription('REWE SAGT DANKE\nRef: 123')).toBe(
      'rewe sagt danke ref 123',
    );
    // Only line 3+ are dropped (IBAN, BIC, further refs)
    expect(normalizeDescription('Name\nBuchungstext\nIBAN: DE123\nRef: XYZ')).toBe(
      'name buchungstext',
    );
  });

  it('strips dates', () => {
    expect(normalizeDescription('Zahlung 01.12.2025')).not.toContain('2025');
    expect(normalizeDescription('Zahlung 2025-12-01')).not.toContain('2025');
  });

  it('strips amounts like 123.45 or 99,90', () => {
    expect(normalizeDescription('Betrag 99,90 EUR')).not.toMatch(/\d+[,.]\d{2}/);
  });

  it('preserves * for PayPal-style merchant names', () => {
    expect(normalizeDescription('Amazon.de*Z18913WA4')).toContain('*');
  });

  it('truncates to 80 chars', () => {
    const long = 'a'.repeat(100);
    expect(normalizeDescription(long).length).toBeLessThanOrEqual(80);
  });
});

describe('categorizeTransactionByKeywords', () => {
  it('matches groceries by supermarket name', () => {
    expect(categorizeTransactionByKeywords('REWE SAGT DANKE')).toBe('groceries');
    expect(categorizeTransactionByKeywords('Lidl Kaufen')).toBe('groceries');
    expect(categorizeTransactionByKeywords('ALDI SUED')).toBe('groceries');
  });

  it('matches housing by keyword', () => {
    expect(categorizeTransactionByKeywords('Hausverwaltung Musterstraße')).toBe(
      'housing',
    );
    expect(categorizeTransactionByKeywords('Miete Januar 2025')).toBe('housing');
  });

  it('matches transport by fuel station', () => {
    expect(categorizeTransactionByKeywords('Aral Tankstelle')).toBe(
      'transportation',
    );
    expect(categorizeTransactionByKeywords('Shell Station')).toBe(
      'transportation',
    );
  });

  it('matches shopping by Amazon', () => {
    expect(categorizeTransactionByKeywords('Amazon.de*Z18913WA4')).toBe(
      'shopping',
    );
  });

  it('matches leisure by restaurant', () => {
    expect(categorizeTransactionByKeywords('Restaurant Zur Post')).toBe(
      'leisure',
    );
  });

  it('matches savings by investment keywords', () => {
    expect(categorizeTransactionByKeywords('Depot top-up ETF Sparplan')).toBe(
      'savings',
    );
  });

  it('matches income keywords', () => {
    expect(categorizeTransactionByKeywords('Gehalt Dezember 2025')).toBe(
      'income',
    );
  });

  it('returns other when no keyword matches', () => {
    expect(categorizeTransactionByKeywords('XYZ UNBEKANNT 4711')).toBe('other');
  });
});
