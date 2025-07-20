// Catalog persistence functionality
import * as fs from 'fs';
import { CardVariant } from '../domain/types';
import { serializeCatalog } from './catalogBuilder';
import { writeJsonAtomic, readJson } from '../io/fileUtils';

export const CATALOG_PATH = 'catalog.json';

/**
 * Loads catalog from disk if file exists, otherwise returns empty array
 */
export async function loadCatalog(): Promise<CardVariant[]> {
  try {
    const data = await readJson<CardVariant[]>(CATALOG_PATH);
    return data ?? [];
  } catch (error) {
    console.warn('Failed to load catalog:', error);
    return [];
  }
}

/**
 * Saves catalog to disk using atomic write
 */
export async function saveCatalog(catalog: CardVariant[]): Promise<void> {
  try {
    await writeJsonAtomic(CATALOG_PATH, catalog);
  } catch (error) {
    throw new Error(`Failed to save catalog: ${error}`);
  }
}

/**
 * Ensures catalog exists - loads from disk or builds and saves new one
 */
export async function ensureCatalog(buildFn: () => CardVariant[]): Promise<CardVariant[]> {
  const existing = await loadCatalog();
  
  if (existing.length > 0) {
    return existing;
  }
  
  // Build new catalog
  const newCatalog = buildFn();
  await saveCatalog(newCatalog);
  return newCatalog;
}