// CLI integration tests
import { spawn } from 'child_process';
import * as fs from 'fs';
import { CURRENT_PATH, BASELINE_PATH } from '../src/scan/paths';
import { CATALOG_PATH } from '../src/catalog/catalogStore';

// Clean up files after tests
afterEach(() => {
  const filesToClean = [CURRENT_PATH, BASELINE_PATH, CATALOG_PATH];
  for (const file of filesToClean) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
});

function runCliCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['ts-node', 'bin/cli.ts', command], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code || 0
      });
    });
  });
}

describe('CLI Integration', () => {
  test('scan command creates current.json file', async () => {
    expect(fs.existsSync(CURRENT_PATH)).toBe(false);
    
    const result = await runCliCommand('scan');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Starting scan...');
    expect(result.stdout).toContain('Scan completed:');
    expect(fs.existsSync(CURRENT_PATH)).toBe(true);
  }, 30000);

  test('promote command requires current.json to exist', async () => {
    const result = await runCliCommand('promote');
    
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Current snapshot file is missing');
  }, 30000);

  test('promote command creates baseline.json when current exists', async () => {
    // First scan to create current
    await runCliCommand('scan');
    expect(fs.existsSync(CURRENT_PATH)).toBe(true);
    expect(fs.existsSync(BASELINE_PATH)).toBe(false);
    
    // Then promote
    const result = await runCliCommand('promote');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Promoting current to baseline...');
    expect(result.stdout).toContain('Baseline promoted:');
    expect(fs.existsSync(BASELINE_PATH)).toBe(true);
  }, 30000);

  test('report command shows empty results when no baseline exists', async () => {
    const result = await runCliCommand('report');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Generating report...');
    expect(result.stdout).toContain('=== TOP GAINERS ===');
    expect(result.stdout).toContain('No gainers found');
    expect(result.stdout).toContain('=== $1.00 CROSSERS ===');
    expect(result.stdout).toContain('No crossers found');
    expect(result.stdout).toContain('=== FALLEN BELOW $1.00 ===');
    expect(result.stdout).toContain('No fallen cards found');
  }, 30000);

  test('full workflow: scan → promote → scan → report', async () => {
    // Step 1: Initial scan
    const scan1 = await runCliCommand('scan');
    expect(scan1.exitCode).toBe(0);
    expect(fs.existsSync(CURRENT_PATH)).toBe(true);
    
    // Step 2: Promote to baseline
    const promote = await runCliCommand('promote');
    expect(promote.exitCode).toBe(0);
    expect(fs.existsSync(BASELINE_PATH)).toBe(true);
    
    // Step 3: Second scan (with different mock prices due to time difference)
    const scan2 = await runCliCommand('scan');
    expect(scan2.exitCode).toBe(0);
    
    // Step 4: Generate report
    const report = await runCliCommand('report');
    expect(report.exitCode).toBe(0);
    
    // Verify report structure
    expect(report.stdout).toContain('=== TOP GAINERS ===');
    expect(report.stdout).toContain('=== $1.00 CROSSERS ===');
    expect(report.stdout).toContain('=== FALLEN BELOW $1.00 ===');
    expect(report.stdout).toContain('Name | Set | Baseline | Current');
    
    // Should have some data since we have different scan times
    expect(report.stdout).toMatch(/Report generated at \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  }, 45000);

  test('invalid command shows usage help', async () => {
    const result = await runCliCommand('invalid');
    
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Usage: cli <command>');
    expect(result.stdout).toContain('Commands:');
    expect(result.stdout).toContain('scan     - Scan catalog and generate current prices');
    expect(result.stdout).toContain('promote  - Promote current scan to baseline');
    expect(result.stdout).toContain('report   - Generate comparison report');
  }, 30000);

  test('no command shows usage help', async () => {
    const result = await runCliCommand('');
    
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Usage: cli <command>');
  }, 30000);
});