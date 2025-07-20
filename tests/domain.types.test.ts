// Domain types and validation tests
import { buildCardKey, CardIdentity } from '../src/domain/types';
import { collapseWhitespace, assertValidIdentity } from '../src/domain/validation';

describe('buildCardKey', () => {
  test('creates unique keys for cards with varied casing', () => {
    const cards: CardIdentity[] = [
      {
        name: 'Lightning Bolt',
        setCode: 'LEA',
        cardNumber: '161',
        rarity: 'Common',
        finish: 'Nonfoil'
      },
      {
        name: 'LIGHTNING BOLT',
        setCode: 'lea',
        cardNumber: '161',
        rarity: 'common',
        finish: 'nonfoil'
      },
      {
        name: '  Lightning   Bolt  ',
        setCode: ' LEA ',
        cardNumber: ' 161 ',
        rarity: ' Common ',
        finish: ' Nonfoil '
      }
    ];

    const key1 = buildCardKey(cards[0]);
    const key2 = buildCardKey(cards[1]);
    const key3 = buildCardKey(cards[2]);

    // All should be the same after normalization
    expect(key1).toBe(key2);
    expect(key2).toBe(key3);
    expect(key1).toBe('lea|161|common|nonfoil|lightning bolt');
  });

  test('creates different keys for different cards', () => {
    const card1: CardIdentity = {
      name: 'Lightning Bolt',
      setCode: 'LEA',
      cardNumber: '161',
      rarity: 'Common',
      finish: 'Nonfoil'
    };

    const card2: CardIdentity = {
      name: 'Counterspell',
      setCode: 'LEA',
      cardNumber: '55',
      rarity: 'Common',
      finish: 'Nonfoil'
    };

    expect(buildCardKey(card1)).not.toBe(buildCardKey(card2));
  });
});

describe('assertValidIdentity', () => {
  test('accepts valid identity', () => {
    const validIdentity: CardIdentity = {
      name: 'Lightning Bolt',
      setCode: 'LEA',
      cardNumber: '161',
      rarity: 'Common',
      finish: 'Nonfoil'
    };

    expect(() => assertValidIdentity(validIdentity)).not.toThrow();
  });

  test('rejects missing required fields', () => {
    const invalidIdentities: Partial<CardIdentity>[] = [
      { setCode: 'LEA', cardNumber: '161', rarity: 'Common', finish: 'Nonfoil' }, // missing name
      { name: 'Lightning Bolt', cardNumber: '161', rarity: 'Common', finish: 'Nonfoil' }, // missing setCode
      { name: 'Lightning Bolt', setCode: 'LEA', rarity: 'Common', finish: 'Nonfoil' }, // missing cardNumber
      { name: 'Lightning Bolt', setCode: 'LEA', cardNumber: '161', finish: 'Nonfoil' }, // missing rarity
      { name: 'Lightning Bolt', setCode: 'LEA', cardNumber: '161', rarity: 'Common' } // missing finish
    ];

    invalidIdentities.forEach((identity) => {
      expect(() => assertValidIdentity(identity as CardIdentity)).toThrow();
    });
  });

  test('rejects empty string fields', () => {
    const identityWithEmpty: CardIdentity = {
      name: '',
      setCode: 'LEA',
      cardNumber: '161',
      rarity: 'Common',
      finish: 'Nonfoil'
    };

    expect(() => assertValidIdentity(identityWithEmpty)).toThrow();
  });

  test('rejects whitespace-only fields', () => {
    const identityWithWhitespace: CardIdentity = {
      name: '   ',
      setCode: 'LEA',
      cardNumber: '161',
      rarity: 'Common',
      finish: 'Nonfoil'
    };

    expect(() => assertValidIdentity(identityWithWhitespace)).toThrow();
  });
});

describe('collapseWhitespace', () => {
  test('collapses multiple spaces to single space', () => {
    expect(collapseWhitespace('hello    world')).toBe('hello world');
    expect(collapseWhitespace('  multiple   spaces   everywhere  ')).toBe(' multiple spaces everywhere ');
    expect(collapseWhitespace('tab\t\tand\nnewline')).toBe('tab and newline');
  });

  test('handles normal strings without change', () => {
    expect(collapseWhitespace('normal string')).toBe('normal string');
    expect(collapseWhitespace('no-spaces')).toBe('no-spaces');
  });
});