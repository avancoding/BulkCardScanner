// Concurrent pricing fetcher tests
import { fetchInBatches, chunkArray } from '../src/pricing/concurrentFetcher';
import { PriceProvider } from '../src/pricing/priceProvider';
import { MockPriceProvider } from '../src/pricing/mockPriceProvider';

// Mock provider with artificial delay for concurrency testing
class DelayedMockPriceProvider implements PriceProvider {
  private baseProvider: MockPriceProvider;
  private delay: number;

  constructor(delay: number = 100, seedDate?: string) {
    this.baseProvider = new MockPriceProvider(seedDate);
    this.delay = delay;
  }

  async fetchPrices(productKeys: string[]): Promise<Record<string, { price: number | null; url: string }>> {
    // Add artificial delay
    await new Promise(resolve => setTimeout(resolve, this.delay));
    return this.baseProvider.fetchPrices(productKeys);
  }
}

describe('chunkArray', () => {
  test('chunks array into specified sizes', () => {
    const array = [1, 2, 3, 4, 5, 6, 7];
    const chunks = chunkArray(array, 3);
    
    expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  test('handles empty array', () => {
    const chunks = chunkArray([], 3);
    expect(chunks).toEqual([]);
  });

  test('handles array smaller than chunk size', () => {
    const chunks = chunkArray([1, 2], 5);
    expect(chunks).toEqual([[1, 2]]);
  });
});

describe('fetchInBatches', () => {
  const testKeys = [
    'lea|161|common|nonfoil|lightning bolt',
    'lea|232|rare|nonfoil|black lotus',
    'lea|55|common|nonfoil|counterspell',
    'c21|263|uncommon|nonfoil|sol ring',
    'lea|48|rare|nonfoil|ancestral recall'
  ];

  test('returns all prices for small key list', async () => {
    const provider = new MockPriceProvider('2024-01-01');
    const result = await fetchInBatches(testKeys, 2, 2, provider);

    expect(Object.keys(result)).toHaveLength(testKeys.length);
    
    for (const key of testKeys) {
      expect(result[key]).toBeDefined();
      expect(result[key].price).toBeGreaterThanOrEqual(0.50);
      expect(result[key].price).toBeLessThanOrEqual(2.49);
      expect(result[key].url).toMatch(/^https:\/\/example\.tcg\/.+/);
    }
  });

  test('handles empty key array', async () => {
    const provider = new MockPriceProvider('2024-01-01');
    const result = await fetchInBatches([], 2, 2, provider);

    expect(result).toEqual({});
  });

  test('calls provider correct number of times based on batch size', async () => {
    const provider = new MockPriceProvider('2024-01-01');
    const fetchSpy = jest.spyOn(provider, 'fetchPrices');

    const batchSize = 2;
    const expectedBatches = Math.ceil(testKeys.length / batchSize); // 5 keys / 2 = 3 batches

    await fetchInBatches(testKeys, batchSize, 2, provider);

    expect(fetchSpy).toHaveBeenCalledTimes(expectedBatches);
    fetchSpy.mockRestore();
  });

  test('concurrent execution is faster than serial', async () => {
    const delay = 100; // 100ms delay per batch
    const provider = new DelayedMockPriceProvider(delay, '2024-01-01');
    
    const batchSize = 2;
    const concurrency = 2;
    const expectedBatches = Math.ceil(testKeys.length / batchSize); // 3 batches
    
    // With concurrency=2, we should process 2 batches in parallel
    // Expected time should be roughly: ceil(3/2) * delay = 2 * 100ms = 200ms
    // Serial time would be: 3 * 100ms = 300ms
    
    const startTime = Date.now();
    await fetchInBatches(testKeys, batchSize, concurrency, provider);
    const duration = Date.now() - startTime;
    
    const serialTime = expectedBatches * delay;
    const expectedConcurrentTime = Math.ceil(expectedBatches / concurrency) * delay;
    
    // Allow some fudge factor for timing variations
    expect(duration).toBeLessThan(serialTime * 0.8); // Should be significantly faster than serial
    expect(duration).toBeGreaterThanOrEqual(expectedConcurrentTime * 0.8); // But not unreasonably fast
  });

  test('batch size 1 with concurrency 1 equals serial processing', async () => {
    const provider = new MockPriceProvider('2024-01-01');
    const fetchSpy = jest.spyOn(provider, 'fetchPrices');

    await fetchInBatches(testKeys.slice(0, 3), 1, 1, provider);

    expect(fetchSpy).toHaveBeenCalledTimes(3); // One call per key
    
    // Verify each call had exactly one key
    for (let i = 0; i < 3; i++) {
      expect(fetchSpy).toHaveBeenNthCalledWith(i + 1, [testKeys[i]]);
    }

    fetchSpy.mockRestore();
  });

  test('results match direct provider calls', async () => {
    const provider = new MockPriceProvider('2024-01-01');
    
    const batchedResult = await fetchInBatches(testKeys, 2, 2, provider);
    const directResult = await provider.fetchPrices(testKeys);
    
    expect(batchedResult).toEqual(directResult);
  });
});