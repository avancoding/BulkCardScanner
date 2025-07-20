// Report generation tests
import * as fs from 'fs';
import { generateReport } from '../src/report/generateReport';
import { CURRENT_PATH, BASELINE_PATH } from '../src/scan/paths';
import { CardSnapshotRecord } from '../src/domain/types';

// Clean up files after tests
afterEach(() => {
  if (fs.existsSync(CURRENT_PATH)) {
    fs.unlinkSync(CURRENT_PATH);
  }
  if (fs.existsSync(BASELINE_PATH)) {
    fs.unlinkSync(BASELINE_PATH);
  }
});

const createRecord = (
  name: string,
  setCode: string,
  cardNumber: string,
  rarity: string,
  finish: string,
  price: number | null,
  firstSeen?: string
): CardSnapshotRecord => ({
  name,
  setCode,
  cardNumber,
  rarity,
  finish,
  price,
  tcgplayerUrl: `https://example.tcg/${name}`,
  firstSeen
});

describe('generateReport', () => {
  test('returns empty arrays when baseline is missing', async () => {
    // Create current but no baseline
    const current = [
      createRecord('Lightning Bolt', 'LEA', '161', 'Common', 'Nonfoil', 1.50)
    ];
    fs.writeFileSync(CURRENT_PATH, JSON.stringify(current));

    const report = await generateReport('2024-01-02T00:00:00.000Z');

    expect(report.gainers).toEqual([]);
    expect(report.crossers).toEqual([]);
    expect(report.fallen).toEqual([]);
    expect(report.meta.baselineTimestamp).toBeUndefined();
    expect(report.meta.currentTimestamp).toBe('2024-01-02T00:00:00.000Z');
  });

  test('returns empty arrays when current is missing', async () => {
    // Create baseline but no current
    const baseline = [
      createRecord('Lightning Bolt', 'LEA', '161', 'Common', 'Nonfoil', 1.00, '2024-01-01T00:00:00.000Z')
    ];
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline));

    const report = await generateReport();

    expect(report.gainers).toEqual([]);
    expect(report.crossers).toEqual([]);
    expect(report.fallen).toEqual([]);
    expect(report.meta.baselineTimestamp).toBeUndefined();
  });

  test('returns empty arrays when both files are missing', async () => {
    const report = await generateReport();

    expect(report.gainers).toEqual([]);
    expect(report.crossers).toEqual([]);
    expect(report.fallen).toEqual([]);
    expect(report.meta.baselineTimestamp).toBeUndefined();
  });

  test('generates report with gainers, crossers, and fallen', async () => {
    const baseline = [
      // Gainer: $0.60 -> $1.20 (100% gain)
      createRecord('Gainer Card', 'LEA', '100', 'Common', 'Nonfoil', 0.60, '2024-01-01T00:00:00.000Z'),
      // Crosser: $0.90 -> $1.10 (crosses $1.00)
      createRecord('Crosser Card', 'LEA', '200', 'Common', 'Nonfoil', 0.90, '2024-01-01T00:00:00.000Z'),
      // Fallen: $1.50 -> $0.90 (falls below $1.00)
      createRecord('Fallen Card', 'LEA', '300', 'Rare', 'Nonfoil', 1.50, '2024-01-01T00:00:00.000Z'),
      // Gainer + Crosser: $0.70 -> $1.40 (100% gain + crosses)
      createRecord('Both Card', 'LEA', '400', 'Uncommon', 'Nonfoil', 0.70, '2024-01-01T00:00:00.000Z')
    ];

    const current = [
      createRecord('Gainer Card', 'LEA', '100', 'Common', 'Nonfoil', 1.20),
      createRecord('Crosser Card', 'LEA', '200', 'Common', 'Nonfoil', 1.10),
      createRecord('Fallen Card', 'LEA', '300', 'Rare', 'Nonfoil', 0.90),
      createRecord('Both Card', 'LEA', '400', 'Uncommon', 'Nonfoil', 1.40)
    ];

    fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline));
    fs.writeFileSync(CURRENT_PATH, JSON.stringify(current));

    const report = await generateReport('2024-01-02T12:00:00.000Z');

    // Check gainers
    expect(report.gainers).toHaveLength(2);
    expect(report.gainers.find(g => g.name === 'Gainer Card')).toBeDefined();
    expect(report.gainers.find(g => g.name === 'Both Card')).toBeDefined();

    // Check crossers
    expect(report.crossers).toHaveLength(2);
    expect(report.crossers.find(c => c.name === 'Crosser Card')).toBeDefined();
    expect(report.crossers.find(c => c.name === 'Both Card')).toBeDefined();

    // Check fallen
    expect(report.fallen).toHaveLength(1);
    expect(report.fallen[0].name).toBe('Fallen Card');

    // Check isCrosser flags
    const bothCardGainer = report.gainers.find(g => g.name === 'Both Card');
    const gainerCardGainer = report.gainers.find(g => g.name === 'Gainer Card');
    expect(bothCardGainer?.isCrosser).toBe(true);
    expect(gainerCardGainer?.isCrosser).toBeUndefined();

    // Check timestamps
    expect(report.meta.baselineTimestamp).toBe('2024-01-01T00:00:00.000Z');
    expect(report.meta.currentTimestamp).toBe('2024-01-02T12:00:00.000Z');
  });

  test('calculates earliest firstSeen as baselineTimestamp', async () => {
    const baseline = [
      createRecord('Card A', 'LEA', '100', 'Common', 'Nonfoil', 1.00, '2024-01-03T00:00:00.000Z'),
      createRecord('Card B', 'LEA', '200', 'Common', 'Nonfoil', 1.00, '2024-01-01T00:00:00.000Z'),
      createRecord('Card C', 'LEA', '300', 'Common', 'Nonfoil', 1.00, '2024-01-02T00:00:00.000Z'),
      createRecord('Card D', 'LEA', '400', 'Common', 'Nonfoil', 1.00) // No firstSeen
    ];

    const current = baseline.map(record => ({ ...record, price: 1.50 }));

    fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline));
    fs.writeFileSync(CURRENT_PATH, JSON.stringify(current));

    const report = await generateReport();

    expect(report.meta.baselineTimestamp).toBe('2024-01-01T00:00:00.000Z');
  });

  test('handles baseline with no firstSeen timestamps', async () => {
    const baseline = [
      createRecord('Card A', 'LEA', '100', 'Common', 'Nonfoil', 1.00),
      createRecord('Card B', 'LEA', '200', 'Common', 'Nonfoil', 1.00)
    ];

    const current = baseline.map(record => ({ ...record, price: 1.50 }));

    fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline));
    fs.writeFileSync(CURRENT_PATH, JSON.stringify(current));

    const report = await generateReport();

    expect(report.meta.baselineTimestamp).toBeUndefined();
  });

  test('uses current time when currentTimestamp not provided', async () => {
    const baseline = [
      createRecord('Card A', 'LEA', '100', 'Common', 'Nonfoil', 1.00, '2024-01-01T00:00:00.000Z')
    ];
    const current = [
      createRecord('Card A', 'LEA', '100', 'Common', 'Nonfoil', 1.50)
    ];

    fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline));
    fs.writeFileSync(CURRENT_PATH, JSON.stringify(current));

    const beforeReport = Date.now();
    const report = await generateReport();
    const afterReport = Date.now();

    expect(report.meta.currentTimestamp).toBeDefined();
    const reportTime = new Date(report.meta.currentTimestamp!).getTime();
    expect(reportTime).toBeGreaterThanOrEqual(beforeReport);
    expect(reportTime).toBeLessThanOrEqual(afterReport);
  });

  test('marks crosser flags correctly for multiple gainers', async () => {
    const baseline = [
      // Both are gainers, only second is crosser
      createRecord('Gainer Only', 'LEA', '100', 'Common', 'Nonfoil', 1.00, '2024-01-01T00:00:00.000Z'),
      createRecord('Gainer Crosser', 'LEA', '200', 'Common', 'Nonfoil', 0.80, '2024-01-01T00:00:00.000Z')
    ];

    const current = [
      createRecord('Gainer Only', 'LEA', '100', 'Common', 'Nonfoil', 1.50), // 50% gain, no cross
      createRecord('Gainer Crosser', 'LEA', '200', 'Common', 'Nonfoil', 1.20) // 50% gain + cross
    ];

    fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline));
    fs.writeFileSync(CURRENT_PATH, JSON.stringify(current));

    const report = await generateReport();

    expect(report.gainers).toHaveLength(2);
    expect(report.crossers).toHaveLength(1);

    const gainerOnly = report.gainers.find(g => g.name === 'Gainer Only');
    const gainerCrosser = report.gainers.find(g => g.name === 'Gainer Crosser');

    expect(gainerOnly?.isCrosser).toBeUndefined();
    expect(gainerCrosser?.isCrosser).toBe(true);
  });
});