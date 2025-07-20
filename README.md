# Bulk Card Scanner

A TypeScript-based tool for scanning trading card prices, tracking price changes, and generating comparison reports.

## Features

- **Catalog Management**: Build and manage card catalogs with rarity filtering
- **Price Scanning**: Fetch current prices with retry logic and rate limiting
- **Baseline Tracking**: Promote scans to baselines for comparison
- **Comparison Reports**: Generate detailed reports showing gainers, crossers, and fallen cards
- **Structured Logging**: Track scan performance and failures
- **Performance Testing**: Synthetic catalog generation for benchmarking

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd BulkCardScanner
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. (Optional) Install globally:
```bash
npm install -g .
```

## Usage

### Command Line Interface

The tool provides three main commands:

#### Scan
Scan the catalog and generate current price data:

```bash
# Basic scan
npx card-scanner scan

# Scan with custom rarities
npx card-scanner scan --rarities=Rare,Uncommon
```

This command:
- Loads or builds a card catalog
- Fetches current prices using the configured provider
- Writes results to `current.json`
- Logs scan summary to `scan.log`

#### Promote
Promote the current scan to baseline for comparison:

```bash
npx card-scanner promote
```

This command:
- Loads the current scan results
- Adds `firstSeen` timestamps to new cards
- Preserves existing `firstSeen` dates for known cards
- Writes the promoted data to `baseline.json`

#### Report
Generate a comparison report between baseline and current prices:

```bash
npx card-scanner report
```

This command generates three comparison tables:
- **Top Gainers**: Cards with significant price increases (baseline ≥ $0.60, current ≥ $0.60)
- **$1.00 Crossers**: Cards that crossed the $1.00 threshold (baseline < $1.00, current ≥ $1.00)
- **Fallen Below $1.00**: Cards that fell below $1.00 (baseline ≥ $1.00, current < $1.00)

### Configuration

The tool uses a `config.json` file to store settings:

```json
{
  "rarities": ["Common", "Uncommon", "Rare", "Rare Holo", "Reverse", "Promo"]
}
```

Rarity filtering can be customized using the `--rarities` option during scan, which saves the new configuration for future scans.

### File Structure

- `catalog.json` - Card catalog data
- `current.json` - Latest scan results
- `baseline.json` - Baseline data for comparisons
- `config.json` - Tool configuration
- `scan.log` - Scan performance logs

## Development

### Scripts

```bash
# Build the project
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Type checking
npm run typecheck
```

### Performance Testing

Generate synthetic catalogs and benchmark scan performance:

```bash
npx ts-node src/scripts/benchmarkScan.ts
```

### Project Structure

```
src/
├── baseline/         # Baseline promotion logic
├── catalog/          # Catalog building and storage
├── compare/          # Price comparison algorithms
├── config/           # Configuration management
├── domain/           # Core types and validation
├── io/               # File I/O utilities
├── logging/          # Structured logging
├── pricing/          # Price fetching with retry logic
├── report/           # Report generation
├── scan/             # Scan orchestration
├── scripts/          # Performance testing scripts
└── util/             # Synthetic data generation

tests/                # Test suites
bin/                  # CLI entry point
```

## API Example

```typescript
import { performScan } from './src/scan/performScan';
import { buildCatalog } from './src/catalog/catalogBuilder';
import { MockPriceProvider } from './src/pricing/mockPriceProvider';

// Build catalog
const catalog = buildCatalog(rawCardData);

// Perform scan
const provider = new MockPriceProvider();
const records = await performScan(catalog, provider);

console.log(`Scanned ${records.length} cards`);
```

## Features in Detail

### Retry Logic
- Automatic retry for rate-limited requests (HTTP 429)
- Exponential backoff: 250ms × attempt number
- Maximum 3 attempts before marking as failed

### Rarity Filtering
- Filter catalog by card rarity during build
- Persistent configuration saves preferences
- CLI override with `--rarities` option

### Structured Logging
- Scan summaries with duration and failure counts
- Appends to `scan.log` for historical tracking
- ISO timestamp format for easy parsing

### Price Comparison
- **Gainers**: Top 50 cards by percentage gain
- **Crossers**: Cards crossing the $1.00 value threshold
- **Fallen**: Cards dropping below $1.00
- Automatic marking of crossers in gainers list

## License

MIT License - see LICENSE file for details