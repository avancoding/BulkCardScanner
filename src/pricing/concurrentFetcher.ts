// Concurrent price fetching with batch processing
import { PriceProvider } from './priceProvider';

export interface BatchProgress {
  completed: number;
  total: number;
  failed: number;
}

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
 * Fetches prices for a single batch with retry logic
 */
async function fetchBatchWithRetry(
  batch: string[],
  provider: PriceProvider,
  maxAttempts: number = 3
): Promise<{ result: Record<string, { price: number | null; url: string }>; failed: boolean }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await provider.fetchPrices(batch);
      return { result, failed: false };
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      // Check for rate limit error
      if (errorMessage.includes('429') && attempt < maxAttempts) {
        const delayMs = 250 * attempt;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      // Max attempts reached or non-rate-limit error
      console.warn(`Batch fetch failed after ${attempt} attempts:`, errorMessage);
      return { result: {}, failed: true };
    }
  }
  
  return { result: {}, failed: true };
}

/**
 * Fetches prices in batches with controlled concurrency
 */
export async function fetchInBatches(
  keys: string[],
  batchSize: number,
  concurrency: number,
  provider: PriceProvider,
  onBatchComplete?: (progress: BatchProgress) => void
): Promise<Record<string, { price: number | null; url: string }>> {
  if (keys.length === 0) {
    return {};
  }

  // Split keys into batches
  const batches = chunkArray(keys, batchSize);
  
  // Process batches with controlled concurrency
  const results: Record<string, { price: number | null; url: string }> = {};
  let completed = 0;
  let failed = 0;
  
  // Process batches in chunks of 'concurrency' size
  for (let i = 0; i < batches.length; i += concurrency) {
    const currentBatches = batches.slice(i, i + concurrency);
    
    // Execute current batch group concurrently with retry
    const promises = currentBatches.map(batch => fetchBatchWithRetry(batch, provider));
    const batchResults = await Promise.all(promises);
    
    // Merge results and update counters
    for (const { result, failed: batchFailed } of batchResults) {
      Object.assign(results, result);
      completed++;
      if (batchFailed) {
        failed++;
      }
      
      // Call progress callback if provided
      if (onBatchComplete) {
        onBatchComplete({
          completed,
          total: batches.length,
          failed
        });
      }
    }
  }
  
  return results;
}