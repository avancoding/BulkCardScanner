// Price provider interface
export interface PriceProvider {
  fetchPrices(productKeys: string[]): Promise<Record<string, { price: number | null; url: string }>>;
}