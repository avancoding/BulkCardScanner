// Scan performance tests
import * as fs from 'fs';
import { performScan } from '../src/scan/performScan';
import { CURRENT_PATH } from '../src/scan/paths';
import { buildCatalog } from '../src/catalog/catalogBuilder';
import { getMockRawCatalog } from '../src/catalog/mockCatalogSource';
import { MockPriceProvider } from '../src/pricing/mockPriceProvider';
import { CardSnapshotRecord } from '../src/domain/types';

// Clean up scan files after tests
afterEach(() => {
  if (fs.existsSync(CURRENT_PATH)) {
    fs.unlinkSync(CURRENT_PATH);
  }
});

describe('performScan', () => {
  test('creates current.json file after scan', async () => {
    const catalog = buildCatalog(getMockRawCatalog());
    const provider = new MockPriceProvider('2024-01-01');
    
    expect(fs.existsSync(CURRENT_PATH)).toBe(false);
    
    await performScan(catalog, provider);
    
    expect(fs.existsSync(CURRENT_PATH)).toBe(true);
  });

  test('returns records count matching catalog size', async () => {
    const catalog = buildCatalog(getMockRawCatalog());
    const provider = new MockPriceProvider('2024-01-01');
    
    const records = await performScan(catalog, provider);
    
    expect(records).toHaveLength(catalog.length);
  });

  test('assigns prices to all records', async () => {
    const catalog = buildCatalog(getMockRawCatalog());
    const provider = new MockPriceProvider('2024-01-01');
    
    const records = await performScan(catalog, provider);
    
    // All records should have prices assigned (mock provider always returns prices)
    for (const record of records) {
      expect(record.price).not.toBeNull();
      expect(typeof record.price).toBe('number');
      expect(record.tcgplayerUrl).toBeTruthy();
      expect(record.tcgplayerUrl.startsWith('https://')).toBe(true);
    }
  });

  test('preserves all card identity fields in snapshot records', async () => {
    const catalog = buildCatalog(getMockRawCatalog());
    const provider = new MockPriceProvider('2024-01-01');
    
    const records = await performScan(catalog, provider);
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const originalCard = catalog[i];
      
      expect(record.name).toBe(originalCard.name);
      expect(record.setCode).toBe(originalCard.setCode);
      expect(record.cardNumber).toBe(originalCard.cardNumber);
      expect(record.rarity).toBe(originalCard.rarity);
      expect(record.finish).toBe(originalCard.finish);
      expect(record.promoId).toBe(originalCard.promoId);
    }
  });

  test('does not include firstSeen field in snapshot records', async () => {
    const catalog = buildCatalog(getMockRawCatalog());
    const provider = new MockPriceProvider('2024-01-01');
    
    const records = await performScan(catalog, provider);
    
    for (const record of records) {
      expect(record.firstSeen).toBeUndefined();
    }
  });

  test('written file contains valid JSON with correct structure', async () => {
    const catalog = buildCatalog(getMockRawCatalog());
    const provider = new MockPriceProvider('2024-01-01');
    
    await performScan(catalog, provider);
    
    const fileContent = fs.readFileSync(CURRENT_PATH, 'utf-8');
    const parsedRecords: CardSnapshotRecord[] = JSON.parse(fileContent);
    
    expect(Array.isArray(parsedRecords)).toBe(true);
    expect(parsedRecords).toHaveLength(catalog.length);
    
    // Verify structure of first record
    const firstRecord = parsedRecords[0];
    expect(firstRecord).toHaveProperty('name');
    expect(firstRecord).toHaveProperty('setCode');
    expect(firstRecord).toHaveProperty('cardNumber');
    expect(firstRecord).toHaveProperty('rarity');
    expect(firstRecord).toHaveProperty('finish');
    expect(firstRecord).toHaveProperty('price');
    expect(firstRecord).toHaveProperty('tcgplayerUrl');
    expect(firstRecord).not.toHaveProperty('firstSeen');
  });
});