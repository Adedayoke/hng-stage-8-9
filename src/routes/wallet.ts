// Wallet Routes
// WHY: Handle all wallet operations

import { Router } from 'express';
import { authenticate, requirePermission } from '../middlwware/auth';
import {
  depositFunds,
  paystackWebhook,
  checkDepositStatus,
  getBalance,
  transferFunds,
  getTransactions,
} from '../controllers/walletController';
import express from 'express';

const router = Router();

/**
 * POST /wallet/deposit
 * Initialize deposit (requires deposit permission)
 */
router.post('/deposit', authenticate, requirePermission('deposit'), depositFunds);

/**
 * POST /wallet/paystack/webhook
 * Paystack webhook endpoint
 * NOTE: No authentication - verified by signature
 * WHY: Paystack doesn't send JWT or API key, uses signature instead
 */
router.post(
  '/paystack/webhook',
  express.raw({ type: 'application/json' }), // Keep raw body for signature verification
  paystackWebhook
);

/**
 * GET /wallet/deposit/:reference/status
 * Check deposit status (requires read permission)
 */
router.get('/deposit/:reference/status', authenticate, requirePermission('read'), checkDepositStatus);

/**
 * GET /wallet/balance
 * Get wallet balance (requires read permission)
 */
router.get('/balance', authenticate, requirePermission('read'), getBalance);

/**
 * POST /wallet/transfer
 * Transfer funds to another wallet (requires transfer permission)
 */
router.post('/transfer', authenticate, requirePermission('transfer'), transferFunds);

/**
 * GET /wallet/transactions
 * Get transaction history (requires read permission)
 */
router.get('/transactions', authenticate, requirePermission('read'), getTransactions);

export default router;
