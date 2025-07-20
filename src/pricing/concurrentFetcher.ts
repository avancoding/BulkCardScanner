// Concurrent price fetching with batch processing
import { PriceProvider } from './priceProvider';

/**
 * Chunks an array into smaller arrays of specified size
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Fetches prices in batches with controlled concurrency
 */
export async function fetchInBatches(
  keys: string[],
  batchSize: number,
  concurrency: number,
  provider: PriceProvider
): Promise<Record<string, { price: number | null; url: string }>> {
  if (keys.length === 0) {
    return {};
  }

  // Split keys into batches
  const batches = chunkArray(keys, batchSize);
  
  // Process batches with controlled concurrency
  const results: Record<string, { price: number | null; url: string }> = {};
  
  // Process batches in chunks of 'concurrency' size
  for (let i = 0; i < batches.length; i += concurrency) {
    const currentBatches = batches.slice(i, i + concurrency);
    
    // Execute current batch group concurrently
    const promises = currentBatches.map(batch => provider.fetchPrices(batch));
    const batchResults = await Promise.all(promises);
    
    // Merge results
    for (const batchResult of batchResults) {
      Object.assign(results, batchResult);
    }
  }
  
  return results;
}