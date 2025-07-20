// Mock price provider tests
import { MockPriceProvider } from '../src/pricing/mockPriceProvider';

describe('MockPriceProvider', () => {
  const testKeys = [
    'lea|161|common|nonfoil|lightning bolt',
    'lea|232|rare|nonfoil|black lotus',
    'lea|55|common|nonfoil|counterspell'
  ];

  test('same seed yields same prices', async () => {
    const provider1 = new MockPriceProvider('2024-01-01');
    const provider2 = new MockPriceProvider('2024-01-01');

    const prices1 = await provider1.fetchPrices(testKeys);
    const prices2 = await provider2.fetchPrices(testKeys);

    expect(prices1).toEqual(prices2);

    // Verify all keys are present
    for (const key of testKeys) {
      expect(prices1[key]).toBeDefined();
      expect(prices2[key]).toBeDefined();
      expect(prices1[key].price).toBe(prices2[key].price);
      expect(prices1[key].url).toBe(prices2[key].url);
    }
  });

  test('different seed date yields different prices for at least one item', async () => {
    const provider1 = new MockPriceProvider('2024-01-01');
    const provider2 = new MockPriceProvider('2024-01-02');

    const prices1 = await provider1.fetchPrices(testKeys);
    const prices2 = await provider2.fetchPrices(testKeys);

    // At least one price should be different
    let foundDifference = false;
    for (const key of testKeys) {
      if (prices1[key].price !== prices2[key].price) {
        foundDifference = true;
        break;
      }
    }

    expect(foundDifference).toBe(true);
  });

  test('all prices within expected bounds', async () => {
    const provider = new MockPriceProvider('2024-01-01');
    const prices = await provider.fetchPrices(testKeys);

    for (const key of testKeys) {
      const { price, url } = prices[key];
      
      expect(price).toBeGreaterThanOrEqual(0.50);
      expect(price).toBeLessThanOrEqual(2.49);
      expect(price).toEqual(Number(price?.toFixed(2))); // Should be valid currency format
      
      expect(url).toMatch(/^https:\/\/example\.tcg\/.+/);
      expect(url).toContain(encodeURIComponent(key));
    }
  });

  test('handles empty key array', async () => {
    const provider = new MockPriceProvider('2024-01-01');
    const prices = await provider.fetchPrices([]);

    expect(prices).toEqual({});
  });

  test('generates correct URLs for complex keys', async () => {
    const complexKey = 'set with spaces|123/456|rare+|foil|card name & symbols';
    const provider = new MockPriceProvider('2024-01-01');
    const prices = await provider.fetchPrices([complexKey]);

    expect(prices[complexKey].url).toBe(`https://example.tcg/${encodeURIComponent(complexKey)}`);
  });

  test('default constructor uses current date seed', async () => {
    const provider1 = new MockPriceProvider();
    const provider2 = new MockPriceProvider();

    const prices1 = await provider1.fetchPrices(testKeys);
    const prices2 = await provider2.fetchPrices(testKeys);

    // Should be same since they both use today's date
    expect(prices1).toEqual(prices2);
  });
});