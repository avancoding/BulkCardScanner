// Config rarity filtering tests
import * as fs from 'fs';
import { loadConfig, saveConfig } from '../src/config/configManager';
import { buildCatalog } from '../src/catalog/catalogBuilder';
import { ensureCatalog, CATALOG_PATH } from '../src/catalog/catalogStore';
import { getMockRawCatalog } from '../src/catalog/mockCatalogSource';

// Clean up files after tests
afterEach(() => {
  const filesToClean = ['config.json', CATALOG_PATH];
  for (const file of filesToClean) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
});

describe('Config Manager', () => {
  test('loadConfig returns default rarities when no config file exists', async () => {
    const config = await loadConfig();
    
    expect(config.rarities).toEqual([
      "Common", "Uncommon", "Rare", "Rare Holo", "Reverse", "Promo"
    ]);
  });

  test('saveConfig and loadConfig round trip', async () => {
    const testConfig = {
      rarities: ["Rare", "Uncommon"]
    };
    
    await saveConfig(testConfig);
    const loaded = await loadConfig();
    
    expect(loaded.rarities).toEqual(["Rare", "Uncommon"]);
  });

  test('config file is created after save', async () => {
    expect(fs.existsSync('config.json')).toBe(false);
    
    await saveConfig({ rarities: ["Common"] });
    
    expect(fs.existsSync('config.json')).toBe(true);
  });
});

describe('Rarity Filtering', () => {
  test('buildCatalog filters by allowed rarities', () => {
    const mockData = getMockRawCatalog();
    
    // Get full catalog first
    const fullCatalog = buildCatalog(mockData);
    
    // Filter to only "Rare" cards
    const rareCatalog = buildCatalog(mockData, ["Rare"]);
    
    expect(rareCatalog.length).toBeLessThan(fullCatalog.length);
    
    // All cards in filtered catalog should be "Rare"
    for (const card of rareCatalog) {
      expect(card.rarity).toBe("Rare");
    }
  });

  test('buildCatalog with no matching rarities returns empty catalog', () => {
    const mockData = getMockRawCatalog();
    
    const emptyCatalog = buildCatalog(mockData, ["NonexistentRarity"]);
    
    expect(emptyCatalog).toHaveLength(0);
  });

  test('buildCatalog with multiple rarities includes all matching cards', () => {
    const mockData = getMockRawCatalog();
    
    const filteredCatalog = buildCatalog(mockData, ["Common", "Rare"]);
    
    // All cards should be either Common or Rare
    for (const card of filteredCatalog) {
      expect(["Common", "Rare"]).toContain(card.rarity);
    }
    
    // Should have both Common and Rare cards
    const hasCommon = filteredCatalog.some(card => card.rarity === "Common");
    const hasRare = filteredCatalog.some(card => card.rarity === "Rare");
    expect(hasCommon).toBe(true);
    expect(hasRare).toBe(true);
  });

  test('changing rarities reduces catalog size', async () => {
    // First, build catalog with all rarities
    const fullCatalog = await ensureCatalog(() => buildCatalog(getMockRawCatalog()));
    const fullSize = fullCatalog.length;
    
    // Then rebuild with limited rarities
    const limitedCatalog = await ensureCatalog(
      () => buildCatalog(getMockRawCatalog(), ["Rare"]),
      true // Force rebuild
    );
    
    expect(limitedCatalog.length).toBeLessThan(fullSize);
    expect(limitedCatalog.every(card => card.rarity === "Rare")).toBe(true);
  });

  test('subsequent operations use saved rarities without specifying again', async () => {
    // Save config with limited rarities
    await saveConfig({ rarities: ["Uncommon"] });
    
    // Load config and build catalog
    const config = await loadConfig();
    const catalog = buildCatalog(getMockRawCatalog(), config.rarities);
    
    expect(catalog.every(card => card.rarity === "Uncommon")).toBe(true);
    expect(config.rarities).toEqual(["Uncommon"]);
  });

  test('rarity filtering preserves deduplication', () => {
    // Create mock data with duplicates
    const mockData = [
      ...getMockRawCatalog(),
      ...getMockRawCatalog() // Add duplicates
    ];
    
    const catalog = buildCatalog(mockData, ["Common"]);
    
    // Check that we don't have duplicates
    const keys = new Set();
    for (const card of catalog) {
      const key = `${card.setCode}|${card.cardNumber}|${card.rarity}|${card.finish}|${card.name}`;
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
  });

  test('undefined rarities filter allows all cards', () => {
    const mockData = getMockRawCatalog();
    
    const allCatalog = buildCatalog(mockData);
    const undefinedFilterCatalog = buildCatalog(mockData, undefined);
    
    expect(undefinedFilterCatalog).toEqual(allCatalog);
  });

  test('empty rarities filter returns empty catalog', () => {
    const mockData = getMockRawCatalog();
    
    const emptyCatalog = buildCatalog(mockData, []);
    
    expect(emptyCatalog).toHaveLength(0);
  });
});