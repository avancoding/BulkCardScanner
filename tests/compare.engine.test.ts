// Comparison engine tests
import { computeGainers, computeCrossers, computeFallen } from '../src/compare/comparison';
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

describe('computeGainers', () => {
  test('includes cards with baseline >= $0.60 and current >= $0.60', () => {
    const baseline = [
      createRecord('Lightning Bolt', 'LEA', '161', 'Common', 'Nonfoil', 0.60),
      createRecord('Black Lotus', 'LEA', '232', 'Rare', 'Nonfoil', 1000.00)
    ];
    
    const current = [
      createRecord('Lightning Bolt', 'LEA', '161', 'Common', 'Nonfoil', 1.20),
      createRecord('Black Lotus', 'LEA', '232', 'Rare', 'Nonfoil', 1500.00)
    ];

    const gainers = computeGainers(baseline, current);
    
    expect(gainers).toHaveLength(2);
    expect(gainers[0].percentGain).toBe(50); // Black Lotus: 50% gain
    expect(gainers[1].percentGain).toBe(100); // Lightning Bolt: 100% gain
  });

  test('excludes cards with baseline < $0.60', () => {
    const baseline = [
      createRecord('Cheap Card', 'LEA', '100', 'Common', 'Nonfoil', 0.59),
      createRecord('Expensive Card', 'LEA', '200', 'Rare', 'Nonfoil', 0.60)
    ];
    
    const current = [
      createRecord('Cheap Card', 'LEA', '100', 'Common', 'Nonfoil', 1.00),
      createRecord('Expensive Card', 'LEA', '200', 'Rare', 'Nonfoil', 1.00)
    ];

    const gainers = computeGainers(baseline, current);
    
    expect(gainers).toHaveLength(1);
    expect(gainers[0].name).toBe('Expensive Card');
  });

  test('excludes cards with current < $0.60', () => {
    const baseline = [
      createRecord('Falling Card', 'LEA', '100', 'Common', 'Nonfoil', 1.00),
      createRecord('Rising Card', 'LEA', '200', 'Rare', 'Nonfoil', 0.60)
    ];
    
    const current = [
      createRecord('Falling Card', 'LEA', '100', 'Common', 'Nonfoil', 0.59),
      createRecord('Rising Card', 'LEA', '200', 'Rare', 'Nonfoil', 1.20)
    ];

    const gainers = computeGainers(baseline, current);
    
    expect(gainers).toHaveLength(1);
    expect(gainers[0].name).toBe('Rising Card');
  });

  test('excludes cards with null or zero baseline prices', () => {
    const baseline = [
      createRecord('Null Price', 'LEA', '100', 'Common', 'Nonfoil', null),
      createRecord('Zero Price', 'LEA', '200', 'Common', 'Nonfoil', 0),
      createRecord('Valid Price', 'LEA', '300', 'Common', 'Nonfoil', 1.00)
    ];
    
    const current = [
      createRecord('Null Price', 'LEA', '100', 'Common', 'Nonfoil', 1.00),
      createRecord('Zero Price', 'LEA', '200', 'Common', 'Nonfoil', 1.00),
      createRecord('Valid Price', 'LEA', '300', 'Common', 'Nonfoil', 1.50)
    ];

    const gainers = computeGainers(baseline, current);
    
    expect(gainers).toHaveLength(1);
    expect(gainers[0].name).toBe('Valid Price');
  });

  test('limits results to top 50 by percentGain', () => {
    const baseline: CardSnapshotRecord[] = [];
    const current: CardSnapshotRecord[] = [];
    
    // Create 60 cards with different gains
    for (let i = 1; i <= 60; i++) {
      baseline.push(createRecord(`Card${i}`, 'LEA', i.toString(), 'Common', 'Nonfoil', 1.00));
      // Each card gains i% (Card1 = 1% gain, Card60 = 60% gain)
      current.push(createRecord(`Card${i}`, 'LEA', i.toString(), 'Common', 'Nonfoil', 1.00 + (i * 0.01)));
    }

    const gainers = computeGainers(baseline, current);
    
    expect(gainers).toHaveLength(50);
    // Should be sorted by highest gain first (Card60 with 60% gain)
    expect(gainers[0].name).toBe('Card60');
    expect(gainers[0].percentGain).toBe(60);
    expect(gainers[49].name).toBe('Card11');
    expect(gainers[49].percentGain).toBe(11);
  });

  test('maintains insertion order for tied percentGain values', () => {
    const baseline = [
      createRecord('First Card', 'LEA', '100', 'Common', 'Nonfoil', 1.00),
      createRecord('Second Card', 'LEA', '200', 'Common', 'Nonfoil', 1.00),
      createRecord('Third Card', 'LEA', '300', 'Common', 'Nonfoil', 1.00)
    ];
    
    const current = [
      createRecord('First Card', 'LEA', '100', 'Common', 'Nonfoil', 1.50),
      createRecord('Second Card', 'LEA', '200', 'Common', 'Nonfoil', 1.50),
      createRecord('Third Card', 'LEA', '300', 'Common', 'Nonfoil', 1.50)
    ];

    const gainers = computeGainers(baseline, current);
    
    expect(gainers).toHaveLength(3);
    expect(gainers[0].name).toBe('First Card');
    expect(gainers[1].name).toBe('Second Card');
    expect(gainers[2].name).toBe('Third Card');
    expect(gainers[0].percentGain).toBe(50);
    expect(gainers[1].percentGain).toBe(50);
    expect(gainers[2].percentGain).toBe(50);
  });

  test('rounds percentGain with Math.round', () => {
    const baseline = [
      createRecord('Test Card', 'LEA', '100', 'Common', 'Nonfoil', 3.00)
    ];
    
    const current = [
      createRecord('Test Card', 'LEA', '100', 'Common', 'Nonfoil', 4.01) // 33.67% gain
    ];

    const gainers = computeGainers(baseline, current);
    
    expect(gainers).toHaveLength(1);
    expect(gainers[0].percentGain).toBe(34); // Math.round(33.67) = 34
  });
});

describe('computeCrossers', () => {
  test('includes cards crossing $1.00 threshold', () => {
    const baseline = [
      createRecord('Crosser Card', 'LEA', '100', 'Common', 'Nonfoil', 0.99),
      createRecord('Already Above', 'LEA', '200', 'Rare', 'Nonfoil', 1.50)
    ];
    
    const current = [
      createRecord('Crosser Card', 'LEA', '100', 'Common', 'Nonfoil', 1.00),
      createRecord('Already Above', 'LEA', '200', 'Rare', 'Nonfoil', 2.00)
    ];

    const crossers = computeCrossers(baseline, current);
    
    expect(crossers).toHaveLength(1);
    expect(crossers[0].name).toBe('Crosser Card');
    expect(crossers[0].isCrosser).toBe(true);
    expect(crossers[0].baselinePrice).toBe(0.99);
    expect(crossers[0].currentPrice).toBe(1.00);
  });

  test('excludes cards already above $1.00 in baseline', () => {
    const baseline = [
      createRecord('Already Above', 'LEA', '100', 'Rare', 'Nonfoil', 1.00)
    ];
    
    const current = [
      createRecord('Already Above', 'LEA', '100', 'Rare', 'Nonfoil', 2.00)
    ];

    const crossers = computeCrossers(baseline, current);
    
    expect(crossers).toHaveLength(0);
  });

  test('excludes cards below $1.00 in current', () => {
    const baseline = [
      createRecord('Still Below', 'LEA', '100', 'Common', 'Nonfoil', 0.50)
    ];
    
    const current = [
      createRecord('Still Below', 'LEA', '100', 'Common', 'Nonfoil', 0.99)
    ];

    const crossers = computeCrossers(baseline, current);
    
    expect(crossers).toHaveLength(0);
  });

  test('excludes cards with null or zero baseline prices', () => {
    const baseline = [
      createRecord('Null Price', 'LEA', '100', 'Common', 'Nonfoil', null),
      createRecord('Zero Price', 'LEA', '200', 'Common', 'Nonfoil', 0)
    ];
    
    const current = [
      createRecord('Null Price', 'LEA', '100', 'Common', 'Nonfoil', 1.50),
      createRecord('Zero Price', 'LEA', '200', 'Common', 'Nonfoil', 1.50)
    ];

    const crossers = computeCrossers(baseline, current);
    
    expect(crossers).toHaveLength(0);
  });
});

describe('computeFallen', () => {
  test('includes cards falling below $1.00 threshold', () => {
    const baseline = [
      createRecord('Fallen Card', 'LEA', '100', 'Rare', 'Nonfoil', 1.00),
      createRecord('Still Below', 'LEA', '200', 'Common', 'Nonfoil', 0.50)
    ];
    
    const current = [
      createRecord('Fallen Card', 'LEA', '100', 'Rare', 'Nonfoil', 0.99),
      createRecord('Still Below', 'LEA', '200', 'Common', 'Nonfoil', 0.25)
    ];

    const fallen = computeFallen(baseline, current);
    
    expect(fallen).toHaveLength(1);
    expect(fallen[0].name).toBe('Fallen Card');
    expect(fallen[0].baselinePrice).toBe(1.00);
    expect(fallen[0].currentPrice).toBe(0.99);
    expect(fallen[0].percentGain).toBe(-1); // Negative gain
  });

  test('excludes cards below $1.00 in baseline', () => {
    const baseline = [
      createRecord('Always Below', 'LEA', '100', 'Common', 'Nonfoil', 0.99)
    ];
    
    const current = [
      createRecord('Always Below', 'LEA', '100', 'Common', 'Nonfoil', 0.50)
    ];

    const fallen = computeFallen(baseline, current);
    
    expect(fallen).toHaveLength(0);
  });

  test('excludes cards still above $1.00 in current', () => {
    const baseline = [
      createRecord('Still Above', 'LEA', '100', 'Rare', 'Nonfoil', 2.00)
    ];
    
    const current = [
      createRecord('Still Above', 'LEA', '100', 'Rare', 'Nonfoil', 1.50)
    ];

    const fallen = computeFallen(baseline, current);
    
    expect(fallen).toHaveLength(0);
  });

  test('produces negative percentGain', () => {
    const baseline = [
      createRecord('Fallen Card', 'LEA', '100', 'Rare', 'Nonfoil', 2.00)
    ];
    
    const current = [
      createRecord('Fallen Card', 'LEA', '100', 'Rare', 'Nonfoil', 0.50)
    ];

    const fallen = computeFallen(baseline, current);
    
    expect(fallen).toHaveLength(1);
    expect(fallen[0].percentGain).toBe(-75); // 75% loss
  });

  test('excludes cards with null or zero baseline prices', () => {
    const baseline = [
      createRecord('Null Price', 'LEA', '100', 'Common', 'Nonfoil', null),
      createRecord('Zero Price', 'LEA', '200', 'Common', 'Nonfoil', 0)
    ];
    
    const current = [
      createRecord('Null Price', 'LEA', '100', 'Common', 'Nonfoil', 0.50),
      createRecord('Zero Price', 'LEA', '200', 'Common', 'Nonfoil', 0.50)
    ];

    const fallen = computeFallen(baseline, current);
    
    expect(fallen).toHaveLength(0);
  });
});