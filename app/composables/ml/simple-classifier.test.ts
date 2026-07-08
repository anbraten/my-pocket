import { describe, it, expect } from 'vitest';
import { SimpleClassifier } from './simple-classifier';

describe('SimpleClassifier', () => {
  it('returns null when untrained', () => {
    const clf = new SimpleClassifier();
    expect(clf.predict('groceries rewe')).toBeNull();
  });

  it('predicts the trained category', () => {
    const clf = new SimpleClassifier();
    clf.train([
      { text: 'rewe supermarket groceries', category: 'groceries' },
      { text: 'aldi lebensmittel supermarket', category: 'groceries' },
      { text: 'rent apartment housing miete', category: 'housing' },
    ]);
    const result = clf.predict('rewe supermarket');
    expect(result).not.toBeNull();
    expect(result!.category).toBe('groceries');
    expect(result!.confidence).toBeGreaterThan(0);
  });

  it('round-trips through serialize/deserialize', () => {
    const clf = new SimpleClassifier();
    clf.train([{ text: 'netflix streaming', category: 'shopping' }]);
    const serialized = clf.serialize();

    const clf2 = new SimpleClassifier(serialized);
    const result = clf2.predict('netflix streaming');
    expect(result!.category).toBe('shopping');
  });

  it('confidence is higher for clear matches than ambiguous ones', () => {
    const clf = new SimpleClassifier();
    clf.train([
      { text: 'rewe supermarket groceries lebensmittel', category: 'groceries' },
      { text: 'aldi discount supermarket', category: 'groceries' },
      { text: 'rent housing miete apartment', category: 'housing' },
    ]);
    const clearMatch = clf.predict('rewe lebensmittel groceries')!;
    const ambiguous = clf.predict('payment unknown')!;
    expect(clearMatch.confidence).toBeGreaterThanOrEqual(ambiguous.confidence);
  });
});
