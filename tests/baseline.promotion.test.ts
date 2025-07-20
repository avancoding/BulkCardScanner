// Baseline promotion tests
import * as fs from 'fs';
import { loadBaseline, loadCurrent, promoteBaseline } from '../src/baseline/baselineManager';
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

const mockCurrentRecords: CardSnapshotRecord[] = [
  {
    name: 'Lightning Bolt',
    setCode: 'LEA',
    cardNumber: '161',
    rarity: 'Common',
    finish: 'Nonfoil',
    price: 1.50,
    tcgplayerUrl: 'https://example.tcg/bolt'
  },
  {
    name: 'Black Lotus',
    setCode: 'LEA',
    cardNumber: '232',
    rarity: 'Rare',
    finish: 'Nonfoil',
    price: 25000.00,
    tcgplayerUrl: 'https://example.tcg/lotus'
  }
];

describe('loadBaseline', () => {
  test('returns null when baseline file does not exist', async () => {
    const result = await loadBaseline();
    expect(result).toBeNull();
  });

  test('loads baseline records when file exists', async () => {
    const testRecords: CardSnapshotRecord[] = [{
      ...mockCurrentRecords[0],
      firstSeen: '2024-01-01T00:00:00.000Z'
    }];
    
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(testRecords));
    
    const result = await loadBaseline();
    expect(result).toEqual(testRecords);
  });

  test('returns null for invalid JSON', async () => {
    fs.writeFileSync(BASELINE_PATH, 'invalid json');
    
    const result = await loadBaseline();
    expect(result).toBeNull();
  });
});

describe('loadCurrent', () => {
  test('returns null when current file does not exist', async () => {
    const result = await loadCurrent();
    expect(result).toBeNull();
  });

  test('loads current records when file exists', async () => {
    fs.writeFileSync(CURRENT_PATH, JSON.stringify(mockCurrentRecords));
    
    const result = await loadCurrent();
    expect(result).toEqual(mockCurrentRecords);
  });

  test('returns null for invalid JSON', async () => {
    fs.writeFileSync(CURRENT_PATH, 'invalid json');
    
    const result = await loadCurrent();
    expect(result).toBeNull();
  });
});

describe('promoteBaseline', () => {
  test('throws error when current file is missing', async () => {
    await expect(promoteBaseline()).rejects.toThrow('Current snapshot file is missing - cannot promote to baseline');
  });

  test('creates baseline file after promotion', async () => {
    fs.writeFileSync(CURRENT_PATH, JSON.stringify(mockCurrentRecords));
    
    expect(fs.existsSync(BASELINE_PATH)).toBe(false);
    
    await promoteBaseline();
    
    expect(fs.existsSync(BASELINE_PATH)).toBe(true);
  });

  test('adds firstSeen to records during promotion', async () => {
    fs.writeFileSync(CURRENT_PATH, JSON.stringify(mockCurrentRecords));
    
    const beforePromotion = Date.now();
    const promotedCount = await promoteBaseline();
    const afterPromotion = Date.now();
    
    expect(promotedCount).toBe(mockCurrentRecords.length);
    
    const baseline = await loadBaseline();
    expect(baseline).toHaveLength(mockCurrentRecords.length);
    
    for (const record of baseline!) {
      expect(record.firstSeen).toBeDefined();
      const firstSeenTime = new Date(record.firstSeen!).getTime();
      expect(firstSeenTime).toBeGreaterThanOrEqual(beforePromotion);
      expect(firstSeenTime).toBeLessThanOrEqual(afterPromotion);
    }
  });

  test('preserves existing firstSeen during re-promotion', async () => {
    // Create initial baseline with firstSeen dates
    const initialBaseline: CardSnapshotRecord[] = mockCurrentRecords.map(record => ({
      ...record,
      firstSeen: '2024-01-01T00:00:00.000Z'
    }));
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(initialBaseline));
    
    // Create new current with different prices
    const updatedCurrent = mockCurrentRecords.map(record => ({
      ...record,
      price: (record.price || 0) * 1.1 // 10% price increase
    }));
    fs.writeFileSync(CURRENT_PATH, JSON.stringify(updatedCurrent));
    
    await promoteBaseline();
    
    const newBaseline = await loadBaseline();
    expect(newBaseline).toHaveLength(mockCurrentRecords.length);
    
    // Verify firstSeen dates are preserved
    for (let i = 0; i < newBaseline!.length; i++) {
      expect(newBaseline![i].firstSeen).toBe('2024-01-01T00:00:00.000Z');
      expect(newBaseline![i].price).toBe(updatedCurrent[i].price);
    }
  });

  test('adds firstSeen only to new records during partial re-promotion', async () => {
    // Create baseline with one record
    const existingBaseline: CardSnapshotRecord[] = [{
      ...mockCurrentRecords[0],
      firstSeen: '2024-01-01T00:00:00.000Z'
    }];
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(existingBaseline));
    
    // Create current with both records (one existing, one new)
    fs.writeFileSync(CURRENT_PATH, JSON.stringify(mockCurrentRecords));
    
    const beforePromotion = Date.now();
    await promoteBaseline();
    const afterPromotion = Date.now();
    
    const newBaseline = await loadBaseline();
    expect(newBaseline).toHaveLength(2);
    
    // First record should preserve existing firstSeen
    expect(newBaseline![0].firstSeen).toBe('2024-01-01T00:00:00.000Z');
    
    // Second record should have new firstSeen
    const secondRecordTime = new Date(newBaseline![1].firstSeen!).getTime();
    expect(secondRecordTime).toBeGreaterThanOrEqual(beforePromotion);
    expect(secondRecordTime).toBeLessThanOrEqual(afterPromotion);
  });

  test('written baseline file contains valid JSON structure', async () => {
    fs.writeFileSync(CURRENT_PATH, JSON.stringify(mockCurrentRecords));
    
    await promoteBaseline();
    
    const fileContent = fs.readFileSync(BASELINE_PATH, 'utf-8');
    const parsedRecords: CardSnapshotRecord[] = JSON.parse(fileContent);
    
    expect(Array.isArray(parsedRecords)).toBe(true);
    expect(parsedRecords).toHaveLength(mockCurrentRecords.length);
    
    const firstRecord = parsedRecords[0];
    expect(firstRecord).toHaveProperty('name');
    expect(firstRecord).toHaveProperty('setCode');
    expect(firstRecord).toHaveProperty('cardNumber');
    expect(firstRecord).toHaveProperty('rarity');
    expect(firstRecord).toHaveProperty('finish');
    expect(firstRecord).toHaveProperty('price');
    expect(firstRecord).toHaveProperty('tcgplayerUrl');
    expect(firstRecord).toHaveProperty('firstSeen');
  });
});