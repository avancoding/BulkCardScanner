// Domain validation utilities
import { CardIdentity } from './types';

/**
 * Collapses multiple consecutive whitespace characters into single spaces
 */
export function collapseWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ');
}

/**
 * Normalizes a name by trimming and collapsing whitespace
 */
export function normalizeName(str: string): string {
  return collapseWhitespace(str.trim());
}

/**
 * Validates that all required CardIdentity fields are present and non-empty
 * Throws Error if validation fails
 */
export function assertValidIdentity(identity: CardIdentity): void {
  const requiredFields = ['name', 'setCode', 'cardNumber', 'rarity', 'finish'] as const;
  
  for (const field of requiredFields) {
    const value = identity[field];
    if (!value || typeof value !== 'string' || value.trim() === '') {
      throw new Error(`CardIdentity field '${field}' is required and cannot be empty`);
    }
  }
}