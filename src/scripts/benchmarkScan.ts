#!/usr/bin/env ts-node

// Performance benchmark for scan operations
import { generateSyntheticCatalog } from '../util/syntheticCatalog';
import { performScan } from '../scan/performScan';
import { MockPriceProvider } from '../pricing/mockPriceProvider';

async function runBenchmark() {
  console.log('=== Bulk Card Scanner Benchmark ===\n');
  
  const catalogSizes = [1000, 2500, 5000];
  
  for (const size of catalogSizes) {
    console.log(`Benchmarking catalog size: ${size} cards`);
    
    // Generate synthetic catalog
    console.log('Generating synthetic catalog...');
    const catalogStartTime = Date.now();
    const catalog = generateSyntheticCatalog(size);
    const catalogDuration = Date.now() - catalogStartTime;
    console.log(`Catalog generated in ${catalogDuration}ms`);
    
    // Verify catalog properties
    const rarityDistribution = catalog.reduce((acc, card) => {
      acc[card.rarity] = (acc[card.rarity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Rarity distribution:');
    for (const [rarity, count] of Object.entries(rarityDistribution)) {
      const percentage = ((count / catalog.length) * 100).toFixed(1);
      console.log(`  ${rarity}: ${count} (${percentage}%)`);
    }
    
    // Run scan benchmark
    console.log('\nRunning scan...');
    const provider = new MockPriceProvider('2024-01-01'); // Fixed seed for consistency
    
    const scanStartTime = Date.now();
    const records = await performScan(catalog, provider);
    const scanDuration = Date.now() - scanStartTime;
    
    console.log(`Scan completed in ${scanDuration}ms`);
    console.log(`Records generated: ${records.length}`);
    console.log(`Average time per card: ${(scanDuration / records.length).toFixed(2)}ms`);
    
    // Calculate throughput
    const cardsPerSecond = Math.round((records.length / scanDuration) * 1000);
    console.log(`Throughput: ${cardsPerSecond} cards/second`);
    
    console.log('-'.repeat(50));
  }
  
  console.log('\nBenchmark completed!');
}

// Run benchmark if this script is executed directly
if (require.main === module) {
  runBenchmark().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}