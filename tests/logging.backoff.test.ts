// Logging and backoff tests
import * as fs from 'fs';
import { performScan } from '../src/scan/performScan';
import { PriceProvider } from '../src/pricing/priceProvider';
import { buildCatalog } from '../src/catalog/catalogBuilder';
import { getMockRawCatalog } from '../src/catalog/mockCatalogSource';
import { CURRENT_PATH } from '../src/scan/paths';

const SCAN_LOG_PATH = 'scan.log';

// Clean up files after tests
afterEach(() => {
  const filesToClean = [CURRENT_PATH, SCAN_LOG_PATH];
  for (const file of filesToClean) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
});

class MockRetryProvider implements PriceProvider {
  private attemptCounts = new Map<string, number>();
  private totalAttempts = 0;

  async fetchPrices(productKeys: string[]): Promise<Record<string, { price: number | null; url: string }>> {
    const result: Record<string, { price: number | null; url: string }> = {};
    
    for (const key of productKeys) {
      const attempts = this.attemptCounts.get(key) || 0;
      this.attemptCounts.set(key, attempts + 1);
      this.totalAttempts++;
      
      // Fail first two attempts with 429 error, succeed on third
      if (attempts < 2) {
        throw new Error('HTTP 429 Too Many Requests - Rate limit exceeded');
      }
      
      // Success on third attempt
      result[key] = {
        price: 1.50,
        url: `https://example.tcg/${key}`
      };
    }
    
    return result;
  }
  
  getTotalAttempts(): number {
    return this.totalAttempts;
  }
  
  getMaxAttemptsForAnyKey(): number {
    return Math.max(...Array.from(this.attemptCounts.values()));
  }
}

class MockFailingProvider implements PriceProvider {
  async fetchPrices(productKeys: string[]): Promise<Record<string, { price: number | null; url: string }>> {
    // Always fail with 429 to test max attempts
    throw new Error('HTTP 429 Too Many Requests - Persistent rate limit');
  }
}

class MockNon429Provider implements PriceProvider {
  async fetchPrices(productKeys: string[]): Promise<Record<string, { price: number | null; url: string }>> {
    // Fail with non-429 error (should not retry)
    throw new Error('Network connection failed');
  }
}

describe('Retry and Backoff Logic', () => {
  test('provider throwing 429 retries up to 3 attempts then succeeds', async () => {
    const catalog = buildCatalog(getMockRawCatalog().slice(0, 1)); // Single card for easier testing
    const provider = new MockRetryProvider();
    
    const records = await performScan(catalog, provider);
    
    // Should succeed after 3 attempts
    expect(records).toHaveLength(1);
    expect(records[0].price).toBe(1.50);
    expect(provider.getMaxAttemptsForAnyKey()).toBe(3);
  });

  test('provider failing all attempts logs failure but continues', async () => {
    const catalog = buildCatalog(getMockRawCatalog().slice(0, 1));
    const provider = new MockFailingProvider();
    
    // Should not throw error, but handle gracefully
    const records = await performScan(catalog, provider);
    
    expect(records).toHaveLength(1);
    expect(records[0].price).toBeNull(); // No price data due to failures
  });

  test('non-429 errors do not trigger retry', async () => {
    const catalog = buildCatalog(getMockRawCatalog().slice(0, 1));
    const provider = new MockNon429Provider();
    
    const records = await performScan(catalog, provider);
    
    expect(records).toHaveLength(1);
    expect(records[0].price).toBeNull();
  });

  test('scan log contains summary line after scan', async () => {
    const catalog = buildCatalog(getMockRawCatalog());
    const provider = new MockRetryProvider();
    
    expect(fs.existsSync(SCAN_LOG_PATH)).toBe(false);
    
    await performScan(catalog, provider);
    
    expect(fs.existsSync(SCAN_LOG_PATH)).toBe(true);
    
    const logContent = fs.readFileSync(SCAN_LOG_PATH, 'utf-8');
    expect(logContent).toMatch(/SCAN total=\d+ duration=\d+ms failed=\d+/);
    expect(logContent).toContain(`total=${catalog.length}`);
  });

  test('multiple scans append to log file', async () => {
    const catalog = buildCatalog(getMockRawCatalog().slice(0, 2));
    const provider = new MockRetryProvider();
    
    // First scan
    await performScan(catalog, provider);
    const firstLogContent = fs.readFileSync(SCAN_LOG_PATH, 'utf-8');
    const firstLineCount = firstLogContent.split('\n').filter(line => line.trim()).length;
    
    // Second scan
    await performScan(catalog, provider);
    const secondLogContent = fs.readFileSync(SCAN_LOG_PATH, 'utf-8');
    const secondLineCount = secondLogContent.split('\n').filter(line => line.trim()).length;
    
    expect(secondLineCount).toBe(firstLineCount + 1);
  });

  test('log format includes timestamp and structured data', async () => {
    const catalog = buildCatalog(getMockRawCatalog().slice(0, 1));
    const provider = new MockRetryProvider();
    
    const beforeScan = Date.now();
    await performScan(catalog, provider);
    const afterScan = Date.now();
    
    const logContent = fs.readFileSync(SCAN_LOG_PATH, 'utf-8');
    const logLine = logContent.trim();
    
    // Should match format: YYYY-MM-DDTHH:mm:ss.sssZ SCAN total=N duration=Nms failed=N
    expect(logLine).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z SCAN total=\d+ duration=\d+ms failed=\d+$/);
    
    // Verify timestamp is reasonable
    const timestampMatch = logLine.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
    expect(timestampMatch).toBeTruthy();
    
    const logTimestamp = new Date(timestampMatch![1]).getTime();
    expect(logTimestamp).toBeGreaterThanOrEqual(beforeScan);
    expect(logTimestamp).toBeLessThanOrEqual(afterScan);
  });

  test('failed batches are counted in summary', async () => {
    const catalog = buildCatalog(getMockRawCatalog());
    const provider = new MockFailingProvider();
    
    await performScan(catalog, provider);
    
    const logContent = fs.readFileSync(SCAN_LOG_PATH, 'utf-8');
    
    // Should show failures in the log
    expect(logContent).toMatch(/failed=[1-9]\d*/); // At least 1 failure
  });

  test('successful scans show zero failures', async () => {
    const catalog = buildCatalog(getMockRawCatalog().slice(0, 1));
    const provider = new MockRetryProvider();
    
    await performScan(catalog, provider);
    
    const logContent = fs.readFileSync(SCAN_LOG_PATH, 'utf-8');
    expect(logContent).toContain('failed=0');
  });
});