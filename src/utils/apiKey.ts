// API Key Utilities
// WHY: Generate secure API keys and handle expiry conversion

import crypto from 'crypto';

/**
 * Generate a cryptographically secure API key
 * Format: sk_live_<random_hex>
 * WHY: Prefix makes it identifiable, random hex ensures uniqueness
 */
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(32);
  const hexString = randomBytes.toString('hex');
  return `sk_live_${hexString}`;
}

/**
 * Convert expiry string to Date
 * Accepts: 1H, 1D, 1M, 1Y (Hour, Day, Month, Year)
 * WHY: Store actual datetime in DB, not string format
 */
export function parseExpiry(expiryString: string): Date {
  const now = new Date();
  const value = parseInt(expiryString.slice(0, -1), 10);
  const unit = expiryString.slice(-1).toUpperCase();

  if (isNaN(value) || value <= 0) {
    throw new Error('Invalid expiry value');
  }

  switch (unit) {
    case 'H': // Hour
      return new Date(now.getTime() + value * 60 * 60 * 1000);
    case 'D': // Day
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    case 'M': // Month (30 days)
      return new Date(now.getTime() + value * 30 * 24 * 60 * 60 * 1000);
    case 'Y': // Year (365 days)
      return new Date(now.getTime() + value * 365 * 24 * 60 * 60 * 1000);
    default:
      throw new Error('Invalid expiry unit. Use 1H, 1D, 1M, or 1Y');
  }
}

/**
 * Validate expiry string format
 * WHY: Catch invalid formats before processing
 */
export function validateExpiryFormat(expiryString: string): boolean {
  const regex = /^[1-9]\d*[HDMYhdmy]$/;
  return regex.test(expiryString);
}
