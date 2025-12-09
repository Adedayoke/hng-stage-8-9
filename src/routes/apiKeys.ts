// API Key Management Routes
// WHY: Create, list, rollover, and revoke API keys

import { Router } from 'express';
import { authenticate } from '../middlwware/auth';
import {
  createApiKey,
  rolloverApiKey,
  listApiKeys,
  revokeApiKey,
} from '../controllers/apiKeyController';

const router = Router();

// All API key routes require JWT authentication
// WHY: Only authenticated users can manage their API keys
router.use(authenticate);

/**
 * POST /keys/create
 * Create new API key
 */
router.post('/create', createApiKey);

/**
 * POST /keys/rollover
 * Rollover expired API key
 */
router.post('/rollover', rolloverApiKey);

/**
 * GET /keys/list
 * List all API keys for user
 */
router.get('/list', listApiKeys);

/**
 * DELETE /keys/:id/revoke
 * Revoke an API key
 */
router.delete('/:id/revoke', revokeApiKey);

export default router;
