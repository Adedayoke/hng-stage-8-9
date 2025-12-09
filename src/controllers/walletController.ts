// Wallet Controller
// WHY: Handle all wallet operations - deposits, transfers, balance, history

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../config/database';
import { initializeTransaction, verifyTransaction, verifyWebhookSignature } from '../services/paystack';
import { generateTransactionReference } from '../utils/wallet';
import { Prisma } from '@prisma/client';

/**
 * POST /wallet/deposit
 * Initialize Paystack deposit
 * 
 * Flow:
 * 1. Create pending transaction
 * 2. Call Paystack to get payment link
 * 3. Return link to user
 * 4. User pays on Paystack
 * 5. Paystack sends webhook (handled separately)
 */
export const depositFunds = [
  body('amount')
    .isFloat({ min: 100 })
    .withMessage('Amount must be at least ₦100'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user!.id;
      const { amount } = req.body;

      // Get user's wallet
      const wallet = await prisma.wallet.findUnique({
        where: { userId },
        include: { user: true },
      });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found',
        });
      }

      // Generate unique reference
      const reference = generateTransactionReference();

      // Initialize Paystack transaction
      const paystackResult = await initializeTransaction(
        wallet.user.email,
        amount,
        reference
      );

      if (!paystackResult.success) {
        return res.status(500).json({
          success: false,
          message: paystackResult.message,
        });
      }

      // Create pending transaction in database
      const transaction = await prisma.transaction.create({
        data: {
          reference,
          type: 'DEPOSIT',
          amount,
          status: 'PENDING',
          walletId: wallet.id,
          senderId: userId,
          paystackReference: paystackResult.data.reference,
          authorizationUrl: paystackResult.data.authorization_url,
          description: 'Wallet deposit via Paystack',
        },
      });

      res.status(200).json({
        success: true,
        message: 'Payment initialized. Complete payment using the link.',
        data: {
          reference: transaction.reference,
          authorization_url: paystackResult.data.authorization_url,
          access_code: paystackResult.data.access_code,
        },
      });
    } catch (error) {
      console.error('Deposit error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize deposit',
      });
    }
  },
];

/**
 * POST /wallet/paystack/webhook
 * Handle Paystack webhook notifications
 * 
 * CRITICAL: This is the ONLY place that credits wallets!
 * 
 * Security:
 * - Verify Paystack signature
 * - Check transaction hasn't been processed (idempotency)
 * - Use database transaction for atomicity
 */
export const paystackWebhook = async (req: Request, res: Response) => {
  try {
    // Get Paystack signature from header
    const paystackSignature = req.headers['x-paystack-signature'] as string;

    if (!paystackSignature) {
      return res.status(400).json({ status: false, message: 'No signature' });
    }

    // Parse body if it's raw buffer (from express.raw middleware)
    let body = req.body;
    let rawBody: string;
    
    if (Buffer.isBuffer(body)) {
      rawBody = body.toString('utf8');
      body = JSON.parse(rawBody);
    } else {
      rawBody = JSON.stringify(body);
    }

    // Verify webhook signature
    // WHY: Prevent attackers from sending fake "payment successful" webhooks!
    const isValid = verifyWebhookSignature(rawBody, paystackSignature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ status: false, message: 'Invalid signature' });
    }

    // We only care about successful charges
    if (body.event === 'charge.success') {
      const { reference, amount, status } = body.data;

      // Find transaction by reference
      const transaction = await prisma.transaction.findUnique({
        where: { reference },
        include: { wallet: true },
      });

      if (!transaction) {
        console.log('Transaction not found:', reference);
        return res.status(404).json({ status: false, message: 'Transaction not found' });
      }

      // Idempotency check: Don't process twice!
      // WHY: Paystack may send same webhook multiple times
      if (transaction.status === 'SUCCESS') {
        console.log('Transaction already processed:', reference);
        return res.status(200).json({ status: true, message: 'Already processed' });
      }

      // Convert kobo back to naira
      const amountInNaira = amount / 100;

      // Use database transaction for atomicity
      // WHY: Both updates must succeed or neither (prevents inconsistent state)
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Update transaction status
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: status === 'success' ? 'SUCCESS' : 'FAILED',
          },
        });

        // Credit wallet if successful
        if (status === 'success') {
          await tx.wallet.update({
            where: { id: transaction.walletId },
            data: {
              balance: {
                increment: amountInNaira,
              },
            },
          });

          console.log(`Wallet credited: ${amountInNaira} for reference ${reference}`);
        }
      });

      return res.status(200).json({ status: true });
    }

    // Other webhook events (we don't process them, but acknowledge)
    res.status(200).json({ status: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ status: false, message: 'Webhook processing failed' });
  }
};

/**
 * GET /wallet/deposit/:reference/status
 * Check deposit status manually
 * 
 * NOTE: This is for user checking status - does NOT credit wallet!
 * Only webhook credits wallets.
 */
export const checkDepositStatus = async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    const userId = req.user!.id;

    // Find transaction
    const transaction = await prisma.transaction.findUnique({
      where: { reference },
      include: {
        wallet: {
          include: { user: true },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    // Verify user owns this transaction
    if (transaction.wallet.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    res.json({
      success: true,
      data: {
        reference: transaction.reference,
        status: transaction.status.toLowerCase(),
        amount: transaction.amount,
        type: transaction.type.toLowerCase(),
        created_at: transaction.createdAt,
      },
    });
  } catch (error) {
    console.error('Check status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check status',
    });
  }
};

/**
 * GET /wallet/balance
 * Get current wallet balance
 */
export const getBalance = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    res.json({
      success: true,
      data: {
        balance: parseFloat(wallet.balance.toString()),
        wallet_number: wallet.walletNumber,
      },
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get balance',
    });
  }
};

/**
 * POST /wallet/transfer
 * Transfer money to another user's wallet
 * 
 * Security:
 * - Check sufficient balance
 * - Use database transaction (atomic operation)
 * - Prevent transfers to self
 */
export const transferFunds = [
  body('wallet_number')
    .isString()
    .isLength({ min: 13, max: 13 })
    .withMessage('Wallet number must be 13 digits'),
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least ₦1'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user!.id;
      const { wallet_number, amount } = req.body;

      // Get sender's wallet
      const senderWallet = await prisma.wallet.findUnique({
        where: { userId },
      });

      if (!senderWallet) {
        return res.status(404).json({
          success: false,
          message: 'Sender wallet not found',
        });
      }

      // Get recipient's wallet
      const recipientWallet = await prisma.wallet.findUnique({
        where: { walletNumber: wallet_number },
        include: { user: true },
      });

      if (!recipientWallet) {
        return res.status(404).json({
          success: false,
          message: 'Recipient wallet not found',
        });
      }

      // Prevent self-transfer
      if (senderWallet.id === recipientWallet.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot transfer to your own wallet',
        });
      }

      // Check sufficient balance
      if (parseFloat(senderWallet.balance.toString()) < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance',
        });
      }

      // Generate reference
      const reference = generateTransactionReference();

      // Execute transfer atomically
      // WHY: Both debit and credit must happen together
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Debit sender
        await tx.wallet.update({
          where: { id: senderWallet.id },
          data: {
            balance: {
              decrement: amount,
            },
          },
        });

        // Credit recipient
        await tx.wallet.update({
          where: { id: recipientWallet.id },
          data: {
            balance: {
              increment: amount,
            },
          },
        });

        // Create transaction record for sender (debit)
        await tx.transaction.create({
          data: {
            reference: `${reference}_debit`,
            type: 'TRANSFER',
            amount: -amount, // Negative for debit
            status: 'SUCCESS',
            walletId: senderWallet.id,
            recipientWalletId: recipientWallet.id,
            senderId: userId,
            recipientId: recipientWallet.userId,
            description: `Transfer to ${wallet_number}`,
          },
        });

        // Create transaction record for recipient (credit)
        await tx.transaction.create({
          data: {
            reference: `${reference}_credit`,
            type: 'TRANSFER',
            amount: amount, // Positive for credit
            status: 'SUCCESS',
            walletId: recipientWallet.id,
            recipientWalletId: senderWallet.id,
            senderId: userId,
            recipientId: recipientWallet.userId,
            description: `Transfer from ${senderWallet.walletNumber}`,
          },
        });
      });

      res.json({
        success: true,
        status: 'success',
        message: 'Transfer completed successfully',
        data: {
          amount,
          recipient: wallet_number,
          reference,
        },
      });
    } catch (error) {
      console.error('Transfer error:', error);
      res.status(500).json({
        success: false,
        message: 'Transfer failed',
      });
    }
  },
];

/**
 * GET /wallet/transactions
 * Get transaction history for user's wallet
 */
export const getTransactions = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    // Get all transactions for this wallet
    const transactions = await prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reference: true,
        type: true,
        amount: true,
        status: true,
        description: true,
        createdAt: true,
      },
    });

    // Format for response (match spec)
    const formattedTransactions = transactions.map((txn: any) => ({
      type: txn.type.toLowerCase(),
      amount: parseFloat(txn.amount.toString()),
      status: txn.status.toLowerCase(),
      description: txn.description,
      date: txn.createdAt,
    }));

    res.json({
      success: true,
      data: formattedTransactions,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
    });
  }
};
