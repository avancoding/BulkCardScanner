// Comparison logic for price analysis
import { CardSnapshotRecord, ComparisonRow, buildCardKey } from '../domain/types';

/**
 * Builds maps for efficient lookup of cards by key
 */
function buildMaps(records: CardSnapshotRecord[]): Map<string, CardSnapshotRecord> {
  const map = new Map<string, CardSnapshotRecord>();
  for (const record of records) {
    const key = buildCardKey(record);
    map.set(key, record);
  }
  return map;
}

/**
 * Creates a ComparisonRow from baseline and current records
 */
function createComparisonRow(
  key: string,
  baseline: CardSnapshotRecord,
  current: CardSnapshotRecord
): ComparisonRow {
  const baselinePrice = baseline.price || 0;
  const currentPrice = current.price || 0;
  const percentGain = baselinePrice > 0 
    ? Math.round(((currentPrice - baselinePrice) / baselinePrice) * 100)
    : 0;

  return {
    key,
    name: baseline.name,
    setCode: baseline.setCode,
    cardNumber: baseline.cardNumber,
    rarity: baseline.rarity,
    finish: baseline.finish,
    baselinePrice,
    currentPrice,
    percentGain
  };
}

/**
 * Computes cards with significant price gains
 * Requires baseline >= $0.60 and current >= $0.60
 * Returns top 50 by percentGain
 */
export function computeGainers(
  baseline: CardSnapshotRecord[],
  current: CardSnapshotRecord[]
): ComparisonRow[] {
  const baselineMap = buildMaps(baseline);
  const currentMap = buildMaps(current);
  const gainers: ComparisonRow[] = [];

  for (const [key, baselineRecord] of baselineMap) {
    const currentRecord = currentMap.get(key);
    if (!currentRecord) continue;

    const baselinePrice = baselineRecord.price;
    const currentPrice = currentRecord.price;

    // Skip if baseline price is null, <= 0, or below threshold
    if (!baselinePrice || baselinePrice <= 0 || baselinePrice < 0.60) continue;
    
    // Skip if current price is null or below threshold
    if (!currentPrice || currentPrice < 0.60) continue;

    const row = createComparisonRow(key, baselineRecord, currentRecord);
    if (row.percentGain > 0) {
      gainers.push(row);
    }
  }

  // Sort by percentGain descending, maintaining insertion order for ties
  gainers.sort((a, b) => b.percentGain - a.percentGain);
  
  // Return top 50
  return gainers.slice(0, 50);
}

/**
 * Computes cards that crossed the $1.00 threshold
 * Requires baseline < $1.00 and current >= $1.00
 */
export function computeCrossers(
  baseline: CardSnapshotRecord[],
  current: CardSnapshotRecord[]
): ComparisonRow[] {
  const baselineMap = buildMaps(baseline);
  const currentMap = buildMaps(current);
  const crossers: ComparisonRow[] = [];

  for (const [key, baselineRecord] of baselineMap) {
    const currentRecord = currentMap.get(key);
    if (!currentRecord) continue;

    const baselinePrice = baselineRecord.price;
    const currentPrice = currentRecord.price;

    // Skip if baseline price is null, <= 0
    if (!baselinePrice || baselinePrice <= 0) continue;
    
    // Skip if current price is null
    if (!currentPrice) continue;

    // Check crossing threshold: baseline < 1.00, current >= 1.00
    if (baselinePrice < 1.00 && currentPrice >= 1.00) {
      const row = createComparisonRow(key, baselineRecord, currentRecord);
      row.isCrosser = true;
      crossers.push(row);
    }
  }

  return crossers;
}

/**
 * Computes cards that fell below the $1.00 threshold
 * Requires baseline >= $1.00 and current < $1.00
 * percentGain will be negative
 */
export function computeFallen(
  baseline: CardSnapshotRecord[],
  current: CardSnapshotRecord[]
): ComparisonRow[] {
  const baselineMap = buildMaps(baseline);
  const currentMap = buildMaps(current);
  const fallen: ComparisonRow[] = [];

  for (const [key, baselineRecord] of baselineMap) {
    const currentRecord = currentMap.get(key);
    if (!currentRecord) continue;

    const baselinePrice = baselineRecord.price;
    const currentPrice = currentRecord.price;

    // Skip if baseline price is null, <= 0
    if (!baselinePrice || baselinePrice <= 0) continue;
    
    // Skip if current price is null
    if (!currentPrice) continue;

    // Check falling threshold: baseline >= 1.00, current < 1.00
    if (baselinePrice >= 1.00 && currentPrice < 1.00) {
      const row = createComparisonRow(key, baselineRecord, currentRecord);
      fallen.push(row);
    }
  }

  return fallen;
}