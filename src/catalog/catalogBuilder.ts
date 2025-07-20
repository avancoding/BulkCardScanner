// Catalog building functionality
import { CardIdentity, CardVariant, buildCardKey } from '../domain/types';
import { assertValidIdentity } from '../domain/validation';

/**
 * Builds a validated and deduplicated catalog from raw card identities
 */
export function buildCatalog(rawIdentities: CardIdentity[], allowedRarities?: string[]): CardVariant[] {
  const seenKeys = new Set<string>();
  const catalog: CardVariant[] = [];

  for (const identity of rawIdentities) {
    // Validate the identity
    assertValidIdentity(identity);
    
    // Filter by rarity if specified
    if (allowedRarities && !allowedRarities.includes(identity.rarity)) {
      continue;
    }
    
    // Check for duplicates
    const key = buildCardKey(identity);
    if (seenKeys.has(key)) {
      continue; // Skip duplicate
    }
    
    seenKeys.add(key);
    catalog.push({ ...identity });
  }

  return catalog;
}

/**
 * Serializes a catalog to JSON array format
 */
export function serializeCatalog(catalog: CardVariant[]): string {
  return JSON.stringify(catalog, null, 2);
}