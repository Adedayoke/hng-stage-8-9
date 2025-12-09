// Wallet Utilities
// WHY: Generate unique wallet numbers for transfers

import crypto from 'crypto';

/**
 * Generate unique 13-digit wallet number
 * Format: Random numeric string
 * WHY: Used as account number for transfers between users
 */
export function generateWalletNumber(): string {
  // Generate 13 random digits
  const min = 1000000000000; // 13 digits minimum
  const max = 9999999999999; // 13 digits maximum
  const walletNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  return walletNumber.toString();
}

/**
 * Generate unique transaction reference
 * WHY: Each transaction needs a unique identifier
 */
export function generateTransactionReference(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `TXN_${timestamp}_${random}`;
}
