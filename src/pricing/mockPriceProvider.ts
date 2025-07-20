// Mock price provider with deterministic pricing
import { PriceProvider } from './priceProvider';

/**
 * Simple string hash function for deterministic price generation
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export class MockPriceProvider implements PriceProvider {
  private seedDate: string;

  constructor(seedDate?: string) {
    this.seedDate = seedDate || new Date().toISOString().split('T')[0]; // Default to today YYYY-MM-DD
  }

  async fetchPrices(productKeys: string[]): Promise<Record<string, { price: number | null; url: string }>> {
    const result: Record<string, { price: number | null; url: string }> = {};

    for (const key of productKeys) {
      // Create deterministic hash from key + seed date
      const hashInput = `${key}|${this.seedDate}`;
      const hash = simpleHash(hashInput);
      
      // Generate price between $0.50 and $2.49 (50-249 cents)
      const baseCents = (hash % 200) + 50;
      const price = baseCents / 100;
      
      // Create synthetic URL
      const url = `https://example.tcg/${encodeURIComponent(key)}`;
      
      result[key] = {
        price,
        url
      };
    }

    return result;
  }
}