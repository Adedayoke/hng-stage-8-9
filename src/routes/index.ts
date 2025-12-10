// Routes Index
// WHY: Central place to register all routes

import { Router } from 'express';
import authRoutes from './auth';
import apiKeyRoutes from './apiKeys';
import walletRoutes from './wallet';

const router = Router();

// Root endpoint - Welcome page
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Wallet Service API',
    version: '1.0.0',
    stage: 'HNG Stage 8',
    description: 'Secure wallet service with Paystack integration, JWT & API key authentication',
    features: [
      'Google OAuth authentication',
      'JWT token-based auth',
      'API key management with permissions',
      'Paystack deposit integration',
      'Wallet-to-wallet transfers',
      'Transaction history',
      'Webhook handling'
    ],
    endpoints: {
      authentication: [
        'GET  /auth/google - Login with Google',
        'GET  /auth/google/callback - OAuth callback'
      ],
      apiKeys: [
        'POST /keys/create - Create API key',
        'POST /keys/rollover - Rollover expired key',
        'GET  /keys/list - List all keys',
        'DEL  /keys/:id/revoke - Revoke API key'
      ],
      wallet: [
        'POST /wallet/deposit - Initialize deposit',
        'GET  /wallet/balance - Check balance',
        'POST /wallet/transfer - Transfer funds',
        'GET  /wallet/transactions - Transaction history',
        'GET  /wallet/deposit/:reference/status - Check deposit status'
      ]
    },
    documentation: {
      readme: 'See README.md for full API documentation',
      setup: 'See SETUP.md for setup instructions',
      postman: 'Import Wallet-Service-API.postman_collection.json'
    },
    support: {
      health_check: 'GET /health',
      status: 'operational'
    },
    timestamp: new Date().toISOString()
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/keys', apiKeyRoutes);
router.use('/wallet', walletRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Wallet Service API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
