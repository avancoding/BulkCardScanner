// Scan orchestrator functionality
import { CardVariant, CardSnapshotRecord, buildCardKey } from '../domain/types';
import { PriceProvider } from '../pricing/priceProvider';
import { fetchInBatches, BatchProgress } from '../pricing/concurrentFetcher';
import { writeFileSync } from 'fs';
import { CURRENT_PATH } from './paths';
import { logScanSummary } from '../logging/logger';

/**
 * Performs a complete scan of the catalog and produces a snapshot
 * @param catalog Array of card variants to scan
 * @param provider Price provider to fetch pricing data
 * @returns Promise resolving to array of snapshot records
 */
export async function performScan(
  catalog: CardVariant[],
  provider: PriceProvider
): Promise<CardSnapshotRecord[]> {
  const startTime = Date.now();
  let totalFailed = 0;
  
  // Build keys for all catalog items
  const keys = catalog.map(variant => buildCardKey(variant));
  
  // Create progress callback to track failures
  const onBatchComplete = (progress: BatchProgress) => {
    totalFailed = progress.failed;
  };
  
  // Fetch prices in batches with concurrency control
  const priceResults = await fetchInBatches(keys, 100, 8, provider, onBatchComplete);
  
  // Build snapshot records
  const records: CardSnapshotRecord[] = catalog.map(variant => {
    const key = buildCardKey(variant);
    const priceData = priceResults[key];
    
    return {
      ...variant,
      price: priceData?.price ?? null,
      tcgplayerUrl: priceData?.url ?? ''
    };
  });
  
  // Write to current.json
  writeFileSync(CURRENT_PATH, JSON.stringify(records, null, 2));
  
  // Log scan summary
  const durationMs = Date.now() - startTime;
  logScanSummary({
    total: catalog.length,
    durationMs,
    failed: totalFailed
  });
  
  return records;
}