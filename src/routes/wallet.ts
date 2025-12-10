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
 * @swagger
 * /wallet/deposit:
 *   post:
 *     summary: Initiate a Paystack deposit to wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount in Naira (minimum ₦100)
 *                 example: 5000
 *     responses:
 *       200:
 *         description: Paystack payment initialized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Payment initialized. Complete payment using the link.
 *                 data:
 *                   type: object
 *                   properties:
 *                     reference:
 *                       type: string
 *                       example: TXN-1702200000-ABC123
 *                     authorization_url:
 *                       type: string
 *                       example: https://checkout.paystack.com/abc123
 *                     access_code:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/deposit', authenticate, requirePermission('deposit'), depositFunds);

/**
 * @swagger
 * /wallet/paystack/webhook:
 *   post:
 *     summary: Paystack webhook for payment verification
 *     tags: [Wallet]
 *     description: Public endpoint for Paystack notifications. Signature verified automatically.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid signature or duplicate event
 */
router.post(
  '/paystack/webhook',
  express.raw({ type: 'application/json' }), // Keep raw body for signature verification
  paystackWebhook
);

/**
 * @swagger
 * /wallet/deposit/{reference}/status:
 *   get:
 *     summary: Check deposit status by reference
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction reference
 *     responses:
 *       200:
 *         description: Deposit status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     reference:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, success, failed]
 *                     amount:
 *                       type: number
 *                     type:
 *                       type: string
 *                       enum: [deposit, transfer]
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Unauthorized - not your transaction
 *       404:
 *         description: Transaction not found
 */
router.get('/deposit/:reference/status', authenticate, requirePermission('read'), checkDepositStatus);

/**
 * @swagger
 * /wallet/balance:
 *   get:
 *     summary: Get current wallet balance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 wallet_number:
 *                   type: string
 *                   example: "1234567890123"
 *                 balance:
 *                   type: object
 *                   properties:
 *                     wallet_number:
 *                       type: string
 *                       example: "1234567890123"
 *                     balance:
 *                       type: number
 *                       example: 5000.00
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Wallet not found
 */
router.get('/balance', authenticate, requirePermission('read'), getBalance);

/**
 * @swagger
 * /wallet/transfer:
 *   post:
 *     summary: Transfer funds to another wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - wallet_number
 *               - amount
 *             properties:
 *               wallet_number:
 *                 type: string
 *                 description: 13-digit wallet number of recipient
 *                 example: "1234567890123"
 *               amount:
 *                 type: number
 *                 description: Amount in Naira (minimum ₦1)
 *                 example: 1000
 *     responses:
 *       200:
 *         description: Transfer successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Transfer completed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     amount:
 *                       type: number
 *                     recipient:
 *                       type: string
 *                     reference:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Insufficient balance
 */
router.post('/transfer', authenticate, requirePermission('transfer'), transferFunds);

/**
 * @swagger
 * /wallet/transactions:
 *   get:
 *     summary: Get transaction history
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Transactions per page
 *     responses:
 *       200:
 *         description: Transaction history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [deposit, transfer]
 *                       amount:
 *                         type: number
 *                       status:
 *                         type: string
 *                         enum: [pending, success, failed]
 *                       description:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/transactions', authenticate, requirePermission('read'), getTransactions);

export default router;
