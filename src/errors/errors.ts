// Error classification for the bulk card scanner

/**
 * Error codes for different types of failures
 */
export enum ErrorCode {
  /** Current scan file is missing when required */
  MISSING_CURRENT = 'MISSING_CURRENT',
  
  /** Baseline file is missing when required */
  MISSING_BASELINE = 'MISSING_BASELINE',
  
  /** Authentication error when accessing price provider */
  AUTH_ERROR = 'AUTH_ERROR',
  
  /** Rate limiting error from price provider */
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  
  /** Network error during price fetching */
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  /** File system error during read/write operations */
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  
  /** Invalid configuration provided */
  INVALID_CONFIG = 'INVALID_CONFIG',
  
  /** Validation error for card data */
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

/**
 * Standardized error class with error codes
 */
export class ScannerError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ScannerError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Creates a standardized error for missing current scan file
 */
export function createMissingCurrentError(): ScannerError {
  return new ScannerError(
    ErrorCode.MISSING_CURRENT,
    'Current snapshot file is missing - cannot promote to baseline'
  );
}

/**
 * Creates a standardized error for missing baseline file
 */
export function createMissingBaselineError(): ScannerError {
  return new ScannerError(
    ErrorCode.MISSING_BASELINE,
    'Baseline file is missing - cannot generate report'
  );
}

/**
 * Creates a standardized error for rate limiting
 */
export function createRateLimitError(retryAfter?: number): ScannerError {
  return new ScannerError(
    ErrorCode.RATE_LIMIT_ERROR,
    'Rate limit exceeded',
    { retryAfter }
  );
}