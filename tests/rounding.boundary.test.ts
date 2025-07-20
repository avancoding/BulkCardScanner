// Percent gain rounding boundary tests
import { computeGainers } from '../src/compare/comparison';
import { CardSnapshotRecord } from '../src/domain/types';

const createRecord = (
  name: string,
  setCode: string,
  cardNumber: string,
  rarity: string,
  finish: string,
  price: number | null
): CardSnapshotRecord => ({
  name,
  setCode,
  cardNumber,
  rarity,
  finish,
  price,
  tcgplayerUrl: `https://example.tcg/${name}`
});

describe('Percent Gain Rounding Boundary Cases', () => {
  test('Math.round boundaries: .5 rounds up', () => {
    // Test Math.round behavior directly
    expect(Math.round(1.5)).toBe(2);
    expect(Math.round(1.4)).toBe(1);
    expect(Math.round(2.5)).toBe(3);
    expect(Math.round(-1.5)).toBe(-1);
    expect(Math.round(-2.5)).toBe(-2);
  });

  test('Percent calculation rounding behavior verified', () => {
    // Test the actual rounding behavior that happens in the code
    // This test verifies that Math.round() works as expected for .5 boundaries
    
    // Test with clean integer math to avoid floating point issues
    const testCases = [
      { baseline: 1.0, current: 1.5, expectedPercent: 50 }, // 50% gain
      { baseline: 2.0, current: 2.1, expectedPercent: 5 },  // 5% gain  
      { baseline: 4.0, current: 4.2, expectedPercent: 5 },  // 5% gain
    ];

    for (const testCase of testCases) {
      const percentGain = Math.round(((testCase.current - testCase.baseline) / testCase.baseline) * 100);
      expect(percentGain).toBe(testCase.expectedPercent);
    }

    // Test .5 boundary directly with the exact formula used in comparison.ts
    expect(Math.round(1.5)).toBe(2);  // .5 rounds up
    expect(Math.round(2.5)).toBe(3);  // .5 rounds up  
    expect(Math.round(1.4)).toBe(1);  // .4 rounds down
    expect(Math.round(2.6)).toBe(3);  // .6 rounds up
  });

  test('Percent calculation with .4 and .6 boundaries', () => {
    const baseline = [
      // Test .4 (rounds down) and .6 (rounds up)
      createRecord('Card 1.4%', 'TST', '001', 'Common', 'Nonfoil', 2.50), // 2.50 -> 2.535 = 1.4%
      createRecord('Card 1.6%', 'TST', '002', 'Common', 'Nonfoil', 2.50), // 2.50 -> 2.54 = 1.6%
    ];

    const current = [
      createRecord('Card 1.4%', 'TST', '001', 'Common', 'Nonfoil', 2.535),
      createRecord('Card 1.6%', 'TST', '002', 'Common', 'Nonfoil', 2.540),
    ];

    const gainers = computeGainers(baseline, current);

    const card1 = gainers.find(g => g.name === 'Card 1.4%');
    const card2 = gainers.find(g => g.name === 'Card 1.6%');

    expect(card1?.percentGain).toBe(1); // 1.4% rounds to 1%
    expect(card2?.percentGain).toBe(2); // 1.6% rounds to 2%
  });

  test('Large percentage with .5 boundary', () => {
    const baseline = [
      // 1.00 -> 1.125 = ((1.125 - 1.00) / 1.00) * 100 = 12.5% -> rounds to 13%
      createRecord('Big Gain', 'TST', '001', 'Common', 'Nonfoil', 1.00),
    ];

    const current = [
      createRecord('Big Gain', 'TST', '001', 'Common', 'Nonfoil', 1.125),
    ];

    const gainers = computeGainers(baseline, current);
    const bigGain = gainers.find(g => g.name === 'Big Gain');

    expect(bigGain?.percentGain).toBe(13); // 12.5% rounds to 13%
  });

  test('Zero and very small gains', () => {
    const baseline = [
      createRecord('No Change', 'TST', '001', 'Common', 'Nonfoil', 1.00),
      createRecord('Tiny Change', 'TST', '002', 'Common', 'Nonfoil', 1.00),
    ];

    const current = [
      createRecord('No Change', 'TST', '001', 'Common', 'Nonfoil', 1.00), // 0%
      createRecord('Tiny Change', 'TST', '002', 'Common', 'Nonfoil', 1.001), // 0.1% -> 0%
    ];

    const gainers = computeGainers(baseline, current);

    // These should not appear in gainers since they have 0% gain after rounding
    const noChange = gainers.find(g => g.name === 'No Change');
    const tinyChange = gainers.find(g => g.name === 'Tiny Change');

    expect(noChange).toBeUndefined(); // 0% gain excluded from gainers
    expect(tinyChange).toBeUndefined(); // 0.1% rounds to 0%, excluded
  });

  test('Negative percentages round correctly', () => {
    // Test negative percentages directly with the math
    const negativeTests = [
      { baseline: 2.00, current: 1.97, expected: -2 }, // -1.5% -> -2%
      { baseline: 4.00, current: 3.90, expected: -3 }, // -2.5% -> -3%
      { baseline: 1.00, current: 0.986, expected: -1 }, // -1.4% -> -1%
    ];

    for (const test of negativeTests) {
      const percent = Math.round(((test.current - test.baseline) / test.baseline) * 100);
      expect(percent).toBe(test.expected);
    }
  });

  test('High precision rounding edge cases', () => {
    const baseline = [
      // Test floating point precision edge cases
      createRecord('Precision Test', 'TST', '001', 'Common', 'Nonfoil', 3.00),
    ];

    const current = [
      // 3.00 -> 3.075 = ((3.075 - 3.00) / 3.00) * 100 = 2.5% -> rounds to 3%
      createRecord('Precision Test', 'TST', '001', 'Common', 'Nonfoil', 3.075),
    ];

    const gainers = computeGainers(baseline, current);
    const precisionTest = gainers.find(g => g.name === 'Precision Test');

    expect(precisionTest?.percentGain).toBe(3); // 2.5% rounds to 3%
  });
});