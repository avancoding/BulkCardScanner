// Report generation combining comparison outputs
import { loadBaseline, loadCurrent } from '../baseline/baselineManager';
import { computeGainers, computeCrossers, computeFallen } from '../compare/comparison';
import { ComparisonRow } from '../domain/types';

export interface ReportMeta {
  baselineTimestamp?: string;
  currentTimestamp?: string;
}

export interface Report {
  meta: ReportMeta;
  gainers: ComparisonRow[];
  crossers: ComparisonRow[];
  fallen: ComparisonRow[];
}

/**
 * Generates a comprehensive price comparison report
 */
export async function generateReport(currentTimestamp?: string): Promise<Report> {
  const baseline = await loadBaseline();
  const current = await loadCurrent();

  // Return empty report if either baseline or current is missing
  if (!baseline || !current) {
    return {
      meta: {
        baselineTimestamp: undefined,
        currentTimestamp: currentTimestamp || new Date().toISOString()
      },
      gainers: [],
      crossers: [],
      fallen: []
    };
  }

  // Compute comparison lists
  const gainers = computeGainers(baseline, current);
  const crossers = computeCrossers(baseline, current);
  const fallen = computeFallen(baseline, current);

  // Build set of crosser keys for efficient lookup
  const crosserKeys = new Set(crossers.map(crosser => crosser.key));

  // Mark gainers that are also crossers
  for (const gainer of gainers) {
    if (crosserKeys.has(gainer.key)) {
      gainer.isCrosser = true;
    }
  }

  // Calculate baseline timestamp as earliest firstSeen
  let baselineTimestamp: string | undefined;
  if (baseline.length > 0) {
    const firstSeenDates = baseline
      .map(record => record.firstSeen)
      .filter((date): date is string => !!date)
      .sort();
    
    if (firstSeenDates.length > 0) {
      baselineTimestamp = firstSeenDates[0];
    }
  }

  return {
    meta: {
      baselineTimestamp,
      currentTimestamp: currentTimestamp || new Date().toISOString()
    },
    gainers,
    crossers,
    fallen
  };
}