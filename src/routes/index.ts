// Routes Index
// WHY: Central place to register all routes

import { Router } from 'express';
import authRoutes from './auth';
import apiKeyRoutes from './apiKeys';
import walletRoutes from './wallet';

const router = Router();

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
