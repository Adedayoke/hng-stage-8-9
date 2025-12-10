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
 * @swagger
 * /keys/create:
 *   post:
 *     summary: Create a new API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - permissions
 *             properties:
 *               name:
 *                 type: string
 *                 description: Descriptive name for the API key
 *                 example: My Service Key
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [deposit, transfer, read]
 *                 example: ["deposit", "transfer", "read"]
 *               expiry:
 *                 type: string
 *                 description: Expiry duration (1H, 1D, 1M, 1Y)
 *                 example: 1D
 *     responses:
 *       201:
 *         description: API key created successfully
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
 *                   example: API key created successfully. Save it now - it won't be shown again!
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     api_key:
 *                       type: string
 *                       description: Plain API key (shown only once)
 *                       example: sk_live_1234567890abcdef
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Maximum 5 API keys allowed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/create', createApiKey);

/**
 * @swagger
 * /keys/rollover:
 *   post:
 *     summary: Replace an expired API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expired_key_id
 *             properties:
 *               expired_key_id:
 *                 type: string
 *                 description: ID of the expired key to replace
 *               expiry:
 *                 type: string
 *                 description: New expiry duration (1H, 1D, 1M, 1Y)
 *                 example: 1D
 *     responses:
 *       201:
 *         description: API key rolled over successfully
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
 *                   example: API key rolled over successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     api_key:
 *                       type: string
 *                       description: New plain API key (shown only once)
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Key not expired or not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/rollover', rolloverApiKey);

/**
 * @swagger
 * /keys/list:
 *   get:
 *     summary: List all API keys for authenticated user
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of API keys (without plain keys)
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
 *                     keys:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           permissions:
 *                             type: array
 *                             items:
 *                               type: string
 *                           isActive:
 *                             type: boolean
 *                           expiresAt:
 *                             type: string
 *                             format: date-time
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           status:
 *                             type: string
 *                             enum: [active, expired, revoked]
 *                     total:
 *                       type: integer
 *                       example: 3
 *                     active:
 *                       type: integer
 *                       example: 2
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/list', listApiKeys);

/**
 * @swagger
 * /keys/{id}/revoke:
 *   delete:
 *     summary: Revoke an API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID to revoke
 *     responses:
 *       200:
 *         description: API key revoked successfully
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
 *                   example: API key revoked successfully
 *       404:
 *         description: API key not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.delete('/:id/revoke', revokeApiKey);

export default router;
