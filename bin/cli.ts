#!/usr/bin/env node

import { ensureCatalog } from '../src/catalog/catalogStore';
import { buildCatalog } from '../src/catalog/catalogBuilder';
import { getMockRawCatalog } from '../src/catalog/mockCatalogSource';
import { MockPriceProvider } from '../src/pricing/mockPriceProvider';
import { performScan } from '../src/scan/performScan';
import { promoteBaseline } from '../src/baseline/baselineManager';
import { generateReport } from '../src/report/generateReport';
import { loadConfig, saveConfig } from '../src/config/configManager';

async function scan() {
  console.log('Starting scan...');
  
  // Parse --rarities option if provided
  const args = process.argv.slice(3);
  const raritiesArg = args.find(arg => arg.startsWith('--rarities='));
  let customRarities: string[] | undefined;
  let shouldSaveConfig = false;
  
  if (raritiesArg) {
    customRarities = raritiesArg.split('=')[1].split(',').map(r => r.trim());
    shouldSaveConfig = true;
    console.log(`Using custom rarities: ${customRarities.join(', ')}`);
  }
  
  // Load config and use custom rarities if provided
  const config = await loadConfig();
  const allowedRarities = customRarities || config.rarities;
  
  // Save config if rarities were overridden
  if (shouldSaveConfig && customRarities) {
    await saveConfig({ ...config, rarities: customRarities });
    console.log('Saved rarities to config');
  }
  
  // Load or build catalog with rarity filtering
  const forceRebuild = shouldSaveConfig; // Rebuild if rarities changed
  const catalog = await ensureCatalog(
    () => buildCatalog(getMockRawCatalog(), allowedRarities),
    forceRebuild
  );
  console.log(`Loaded catalog with ${catalog.length} cards (rarities: ${allowedRarities.join(', ')})`);
  
  // Perform scan with mock provider
  const provider = new MockPriceProvider();
  const records = await performScan(catalog, provider);
  
  console.log(`Scan completed: ${records.length} records written to current.json`);
}

async function promote() {
  console.log('Promoting current to baseline...');
  
  try {
    const count = await promoteBaseline();
    console.log(`Baseline promoted: ${count} records`);
  } catch (error) {
    console.error('Promotion failed:', (error as Error).message);
    process.exit(1);
  }
}

function formatTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return `${headers.join(' | ')}\n${'---'.repeat(headers.length)}`;
  }
  
  // Calculate column widths
  const widths = headers.map((header, i) => 
    Math.max(header.length, ...rows.map(row => (row[i] || '').length))
  );
  
  // Format header
  const headerRow = headers.map((header, i) => header.padEnd(widths[i])).join(' | ');
  const separator = widths.map(width => '-'.repeat(width)).join(' | ');
  
  // Format rows
  const dataRows = rows.map(row => 
    row.map((cell, i) => (cell || '').padEnd(widths[i])).join(' | ')
  );
  
  return [headerRow, separator, ...dataRows].join('\n');
}

async function report() {
  console.log('Generating report...');
  
  const reportData = await generateReport();
  
  console.log(`\nReport generated at ${reportData.meta.currentTimestamp}`);
  if (reportData.meta.baselineTimestamp) {
    console.log(`Baseline from ${reportData.meta.baselineTimestamp}`);
  }
  
  // Gainers table
  console.log('\n=== TOP GAINERS ===');
  if (reportData.gainers.length > 0) {
    const gainerRows = reportData.gainers.map(g => [
      g.name,
      g.setCode,
      `$${g.baselinePrice.toFixed(2)}`,
      `$${g.currentPrice.toFixed(2)}`,
      `${g.percentGain}%`,
      g.isCrosser ? 'YES' : ''
    ]);
    console.log(formatTable(
      ['Name', 'Set', 'Baseline', 'Current', 'Gain%', 'Crosser'],
      gainerRows
    ));
  } else {
    console.log('No gainers found');
  }
  
  // Crossers table
  console.log('\n=== $1.00 CROSSERS ===');
  if (reportData.crossers.length > 0) {
    const crosserRows = reportData.crossers.map(c => [
      c.name,
      c.setCode,
      `$${c.baselinePrice.toFixed(2)}`,
      `$${c.currentPrice.toFixed(2)}`,
      `${c.percentGain}%`
    ]);
    console.log(formatTable(
      ['Name', 'Set', 'Baseline', 'Current', 'Gain%'],
      crosserRows
    ));
  } else {
    console.log('No crossers found');
  }
  
  // Fallen table
  console.log('\n=== FALLEN BELOW $1.00 ===');
  if (reportData.fallen.length > 0) {
    const fallenRows = reportData.fallen.map(f => [
      f.name,
      f.setCode,
      `$${f.baselinePrice.toFixed(2)}`,
      `$${f.currentPrice.toFixed(2)}`,
      `${f.percentGain}%`
    ]);
    console.log(formatTable(
      ['Name', 'Set', 'Baseline', 'Current', 'Loss%'],
      fallenRows
    ));
  } else {
    console.log('No fallen cards found');
  }
}

async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'scan':
        await scan();
        break;
      case 'promote':
        await promote();
        break;
      case 'report':
        await report();
        break;
      default:
        console.log('Usage: cli <command> [options]');
        console.log('Commands:');
        console.log('  scan     - Scan catalog and generate current prices');
        console.log('           Options: --rarities=Common,Rare (override rarity filter)');
        console.log('  promote  - Promote current scan to baseline');
        console.log('  report   - Generate comparison report');
        process.exit(1);
    }
  } catch (error) {
    console.error('Command failed:', (error as Error).message);
    process.exit(1);
  }
}

main();