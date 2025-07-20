// Catalog builder and persistence tests
import * as fs from 'fs';
import { buildCatalog } from '../src/catalog/catalogBuilder';
import { loadCatalog, saveCatalog, ensureCatalog, CATALOG_PATH } from '../src/catalog/catalogStore';
import { getMockRawCatalog } from '../src/catalog/mockCatalogSource';
import { CardIdentity } from '../src/domain/types';

// Clean up catalog file after tests
afterEach(() => {
  if (fs.existsSync(CATALOG_PATH)) {
    fs.unlinkSync(CATALOG_PATH);
  }
});

describe('buildCatalog', () => {
  test('deduplicates repeated identities', () => {
    const duplicatedIdentities: CardIdentity[] = [
      {
        name: 'Lightning Bolt',
        setCode: 'LEA',
        cardNumber: '161',
        rarity: 'Common',
        finish: 'Nonfoil'
      },
      {
        name: 'LIGHTNING BOLT', // Different casing, same card
        setCode: 'lea',
        cardNumber: '161',
        rarity: 'common',
        finish: 'nonfoil'
      },
      {
        name: 'Counterspell',
        setCode: 'LEA',
        cardNumber: '55',
        rarity: 'Common',
        finish: 'Nonfoil'
      }
    ];

    const catalog = buildCatalog(duplicatedIdentities);
    
    expect(catalog).toHaveLength(2);
    expect(catalog.find(c => c.name === 'Lightning Bolt')).toBeDefined();
    expect(catalog.find(c => c.name === 'Counterspell')).toBeDefined();
  });

  test('validates all identities', () => {
    const invalidIdentities: Partial<CardIdentity>[] = [
      {
        name: 'Valid Card',
        setCode: 'LEA',
        cardNumber: '161',
        rarity: 'Common',
        finish: 'Nonfoil'
      },
      {
        name: '', // Invalid - empty name
        setCode: 'LEA',
        cardNumber: '162',
        rarity: 'Common',
        finish: 'Nonfoil'
      }
    ];

    expect(() => buildCatalog(invalidIdentities as CardIdentity[])).toThrow();
  });
});

describe('catalog persistence', () => {
  test('loadCatalog returns empty array when file does not exist', () => {
    const catalog = loadCatalog();
    expect(catalog).toEqual([]);
  });

  test('saveCatalog and loadCatalog round trip', () => {
    const mockCatalog = buildCatalog(getMockRawCatalog());
    
    saveCatalog(mockCatalog);
    const loaded = loadCatalog();
    
    expect(loaded).toEqual(mockCatalog);
  });
});

describe('ensureCatalog', () => {
  test('creates catalog file on first run', () => {
    expect(fs.existsSync(CATALOG_PATH)).toBe(false);
    
    const catalog = ensureCatalog(() => buildCatalog(getMockRawCatalog()));
    
    expect(fs.existsSync(CATALOG_PATH)).toBe(true);
    expect(catalog).toHaveLength(8); // Should match mock catalog size
  });

  test('second run loads same catalog without duplicates', () => {
    // First run - create catalog
    const firstRun = ensureCatalog(() => buildCatalog(getMockRawCatalog()));
    const firstRunSize = firstRun.length;
    
    // Second run - should load existing
    const secondRun = ensureCatalog(() => buildCatalog(getMockRawCatalog()));
    
    expect(secondRun).toHaveLength(firstRunSize);
    expect(secondRun).toEqual(firstRun);
  });

  test('loads existing catalog and does not rebuild', () => {
    const mockCatalog = buildCatalog(getMockRawCatalog());
    saveCatalog(mockCatalog);
    
    let buildFnCalled = false;
    const buildFn = () => {
      buildFnCalled = true;
      return [];
    };
    
    const result = ensureCatalog(buildFn);
    
    expect(buildFnCalled).toBe(false);
    expect(result).toEqual(mockCatalog);
  });
});