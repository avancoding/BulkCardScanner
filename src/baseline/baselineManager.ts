// Baseline management functionality
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { CardSnapshotRecord } from '../domain/types';
import { CURRENT_PATH, BASELINE_PATH } from '../scan/paths';
import { createMissingCurrentError } from '../errors/errors';

/**
 * Loads baseline snapshot records from baseline.json
 * @returns Promise resolving to baseline records array or null if file doesn't exist
 */
export async function loadBaseline(): Promise<CardSnapshotRecord[] | null> {
  if (!existsSync(BASELINE_PATH)) {
    return null;
  }
  
  try {
    const content = readFileSync(BASELINE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Loads current snapshot records from current.json
 * @returns Promise resolving to current records array or null if file doesn't exist
 */
export async function loadCurrent(): Promise<CardSnapshotRecord[] | null> {
  if (!existsSync(CURRENT_PATH)) {
    return null;
  }
  
  try {
    const content = readFileSync(CURRENT_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Promotes current snapshot to baseline, adding firstSeen timestamps where missing
 * @returns Promise resolving to the number of records promoted
 * @throws {ScannerError} When current snapshot file is missing
 */
export async function promoteBaseline(): Promise<number> {
  const current = await loadCurrent();
  if (!current) {
    throw createMissingCurrentError();
  }
  
  const existingBaseline = await loadBaseline();
  const existingFirstSeen = new Map<string, string>();
  
  // Build map of existing firstSeen values if baseline exists
  if (existingBaseline) {
    for (const record of existingBaseline) {
      if (record.firstSeen) {
        // Use card identity as key for lookup
        const key = `${record.setCode}|${record.cardNumber}|${record.rarity}|${record.finish}|${record.name}`;
        existingFirstSeen.set(key, record.firstSeen);
      }
    }
  }
  
  const now = new Date().toISOString();
  const promotedRecords: CardSnapshotRecord[] = current.map(record => {
    const key = `${record.setCode}|${record.cardNumber}|${record.rarity}|${record.finish}|${record.name}`;
    const existingDate = existingFirstSeen.get(key);
    
    return {
      ...record,
      firstSeen: existingDate || now
    };
  });
  
  // Write atomically to baseline.json
  writeFileSync(BASELINE_PATH, JSON.stringify(promotedRecords, null, 2));
  
  return promotedRecords.length;
}