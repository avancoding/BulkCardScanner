// Structured logging functionality
import { appendFileSync } from 'fs';

export interface ScanSummary {
  total: number;
  durationMs: number;
  failed: number;
}

const SCAN_LOG_PATH = 'scan.log';

/**
 * Logs scan summary to scan.log file
 */
export function logScanSummary(summary: ScanSummary): void {
  const timestamp = new Date().toISOString();
  const logLine = `${timestamp} SCAN total=${summary.total} duration=${summary.durationMs}ms failed=${summary.failed}\n`;
  
  try {
    appendFileSync(SCAN_LOG_PATH, logLine);
  } catch (error) {
    console.warn('Failed to write to scan log:', error);
  }
}