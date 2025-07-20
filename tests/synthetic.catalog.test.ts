// Synthetic catalog generation tests
import { generateSyntheticCatalog } from '../src/util/syntheticCatalog';
import { buildCardKey } from '../src/domain/types';

describe('Synthetic Catalog Generation', () => {
  test('generates exact number of requested cards', () => {
    const sizes = [10, 100, 500, 1000];
    
    for (const size of sizes) {
      const catalog = generateSyntheticCatalog(size);
      expect(catalog).toHaveLength(size);
    }
  });

  test('generates zero cards when requested size is zero', () => {
    const catalog = generateSyntheticCatalog(0);
    expect(catalog).toHaveLength(0);
  });

  test('all generated cards have required fields', () => {
    const catalog = generateSyntheticCatalog(50);
    
    for (const card of catalog) {
      expect(card.name).toBeDefined();
      expect(typeof card.name).toBe('string');
      expect(card.name.length).toBeGreaterThan(0);
      
      expect(card.setCode).toBeDefined();
      expect(typeof card.setCode).toBe('string');
      expect(card.setCode.length).toBeGreaterThan(0);
      
      expect(card.cardNumber).toBeDefined();
      expect(typeof card.cardNumber).toBe('string');
      expect(card.cardNumber.length).toBeGreaterThan(0);
      
      expect(card.rarity).toBeDefined();
      expect(typeof card.rarity).toBe('string');
      expect(card.rarity.length).toBeGreaterThan(0);
      
      expect(card.finish).toBeDefined();
      expect(typeof card.finish).toBe('string');
      expect(card.finish.length).toBeGreaterThan(0);
    }
  });

  test('all generated cards have unique keys', () => {
    const catalog = generateSyntheticCatalog(1000);
    const keys = new Set<string>();
    
    for (const card of catalog) {
      const key = buildCardKey(card);
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
    
    expect(keys.size).toBe(catalog.length);
  });

  test('generates cards with distributed rarities', () => {
    const catalog = generateSyntheticCatalog(1000);
    const rarityCount = catalog.reduce((acc, card) => {
      acc[card.rarity] = (acc[card.rarity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Should have multiple rarities
    expect(Object.keys(rarityCount).length).toBeGreaterThan(1);
    
    // Common should be most frequent (weighted distribution)
    expect(rarityCount['Common']).toBeDefined();
    expect(rarityCount['Common']).toBeGreaterThan(0);
    
    // Should have some of each rarity type
    const expectedRarities = ['Common', 'Uncommon', 'Rare'];
    for (const rarity of expectedRarities) {
      expect(rarityCount[rarity]).toBeGreaterThan(0);
    }
  });

  test('Common cards are more frequent than Rare cards', () => {
    const catalog = generateSyntheticCatalog(1000);
    const rarityCount = catalog.reduce((acc, card) => {
      acc[card.rarity] = (acc[card.rarity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const commonCount = rarityCount['Common'] || 0;
    const rareCount = rarityCount['Rare'] || 0;
    
    // Common should be significantly more frequent than Rare
    expect(commonCount).toBeGreaterThan(rareCount);
  });

  test('generates cards with valid finishes', () => {
    const catalog = generateSyntheticCatalog(100);
    const validFinishes = ['Nonfoil', 'Foil', 'Reverse', 'Holo'];
    
    for (const card of catalog) {
      expect(validFinishes).toContain(card.finish);
    }
  });

  test('Promo cards have promoId, others do not', () => {
    const catalog = generateSyntheticCatalog(1000);
    
    for (const card of catalog) {
      if (card.rarity === 'Promo') {
        expect(card.promoId).toBeDefined();
        expect(typeof card.promoId).toBe('string');
        expect(card.promoId!.length).toBeGreaterThan(0);
      } else {
        expect(card.promoId).toBeUndefined();
      }
    }
  });

  test('card numbers are properly formatted', () => {
    const catalog = generateSyntheticCatalog(100);
    
    for (const card of catalog) {
      // Card numbers should be strings and not empty
      expect(typeof card.cardNumber).toBe('string');
      expect(card.cardNumber.length).toBeGreaterThan(0);
    }
  });

  test('generates different catalogs on multiple calls', () => {
    const catalog1 = generateSyntheticCatalog(100);
    const catalog2 = generateSyntheticCatalog(100);
    
    // Should generate different catalogs (due to randomness)
    const keys1 = new Set(catalog1.map(card => buildCardKey(card)));
    const keys2 = new Set(catalog2.map(card => buildCardKey(card)));
    
    // Very unlikely to have completely identical catalogs
    let identicalCount = 0;
    for (const key of keys1) {
      if (keys2.has(key)) {
        identicalCount++;
      }
    }
    
    // Should have some differences (allowing for small overlap due to randomness)
    expect(identicalCount).toBeLessThan(catalog1.length);
  });

  test('handles large catalog generation efficiently', () => {
    const startTime = Date.now();
    const catalog = generateSyntheticCatalog(5000);
    const duration = Date.now() - startTime;
    
    expect(catalog).toHaveLength(5000);
    // Performance test - should complete reasonably quickly (no strict assertion)
    console.log(`Generated 5000 cards in ${duration}ms`);
  });

  test('small catalog generation works correctly', () => {
    const sizes = [1, 2, 3, 5];
    
    for (const size of sizes) {
      const catalog = generateSyntheticCatalog(size);
      expect(catalog).toHaveLength(size);
      
      // Verify uniqueness even for small catalogs
      const keys = new Set(catalog.map(card => buildCardKey(card)));
      expect(keys.size).toBe(size);
    }
  });
});