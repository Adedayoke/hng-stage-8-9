// API Key Controller
// WHY: Manage service-to-service authentication keys

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { generateApiKey, parseExpiry, validateExpiryFormat } from '../utils/apiKey';

/**
 * POST /keys/create
 * Create new API key for service-to-service access
 * 
 * SECURITY:
 * - Key is hashed with bcrypt before storing (NEVER store plain text!)
 * - Return plain key ONCE (user must save it)
 * - Enforce max 5 active keys per user
 * - Validate permissions array
 */
export const createApiKey = [
  // Validation
  body('name').isString().notEmpty().withMessage('Name is required'),
  body('permissions')
    .isArray({ min: 1 })
    .withMessage('Permissions must be a non-empty array'),
  body('permissions.*')
    .isIn(['deposit', 'transfer', 'read'])
    .withMessage('Invalid permission. Allowed: deposit, transfer, read'),
  body('expiry')
    .isString()
    .notEmpty()
    .custom((value) => {
      if (!validateExpiryFormat(value)) {
        throw new Error('Invalid expiry format. Use: 1H, 1D, 1M, or 1Y');
      }
      return true;
    }),

  async (req: Request, res: Response) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user!.id;
      const { name, permissions, expiry } = req.body;

      // Check if user already has 5 active keys
      const activeKeysCount = await prisma.apiKey.count({
        where: {
          userId,
          isActive: true,
          expiresAt: {
            gt: new Date(), // Not expired
          },
        },
      });

      if (activeKeysCount >= 5) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 5 active API keys allowed. Revoke or wait for expiry.',
        });
      }

      // Generate API key
      const plainKey = generateApiKey();

      // Hash the key with bcrypt (10 rounds)
      // WHY: If database is compromised, keys are still protected
      const keyHash = await bcrypt.hash(plainKey, 10);

      // Parse expiry to datetime
      const expiresAt = parseExpiry(expiry);

      // Create API key in database
      const apiKey = await prisma.apiKey.create({
        data: {
          name,
          keyHash,
          permissions,
          expiresAt,
          userId,
        },
      });

      // Return plain key ONLY ONCE
      // User must save it - we can't retrieve it again!
      res.status(201).json({
        success: true,
        message: 'API key created successfully. Save it now - it won\'t be shown again!',
        data: {
          id: apiKey.id,
          name: apiKey.name,
          api_key: plainKey, // ONLY time we show the plain key
          permissions: apiKey.permissions,
          expires_at: apiKey.expiresAt.toISOString(),
          created_at: apiKey.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('Create API key error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create API key',
      });
    }
  },
];

/**
 * POST /keys/rollover
 * Create new key with same permissions as an expired key
 * 
 * WHY: Don't make users re-specify permissions when renewing
 * 
 * RULES:
 * - Old key MUST be expired
 * - New key inherits permissions from old key
 * - Old key stays expired (not deleted - for audit trail)
 */
export const rolloverApiKey = [
  body('expired_key_id').isString().notEmpty().withMessage('Expired key ID required'),
  body('expiry')
    .isString()
    .notEmpty()
    .custom((value) => {
      if (!validateExpiryFormat(value)) {
        throw new Error('Invalid expiry format. Use: 1H, 1D, 1M, or 1Y');
      }
      return true;
    }),

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
      const { expired_key_id, expiry } = req.body;

      // Find the expired key
      const expiredKey = await prisma.apiKey.findFirst({
        where: {
          id: expired_key_id,
          userId,
        },
      });

      if (!expiredKey) {
        return res.status(404).json({
          success: false,
          message: 'API key not found',
        });
      }

      // Verify key is actually expired
      if (expiredKey.expiresAt > new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Key is not expired yet. Can only rollover expired keys.',
        });
      }

      // Check active keys limit (same as create)
      const activeKeysCount = await prisma.apiKey.count({
        where: {
          userId,
          isActive: true,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (activeKeysCount >= 5) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 5 active API keys allowed.',
        });
      }

      // Generate new key with same permissions
      const plainKey = generateApiKey();
      const keyHash = await bcrypt.hash(plainKey, 10);
      const expiresAt = parseExpiry(expiry);

      const newApiKey = await prisma.apiKey.create({
        data: {
          name: `${expiredKey.name} (renewed)`,
          keyHash,
          permissions: expiredKey.permissions, // Inherit permissions
          expiresAt,
          userId,
        },
      });

      res.status(201).json({
        success: true,
        message: 'API key rolled over successfully',
        data: {
          id: newApiKey.id,
          name: newApiKey.name,
          api_key: plainKey,
          permissions: newApiKey.permissions,
          expires_at: newApiKey.expiresAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('Rollover API key error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to rollover API key',
      });
    }
  },
];

/**
 * GET /keys/list
 * List all API keys for the authenticated user
 * WHY: Users need to see their keys to manage them
 * NOTE: Does NOT return actual keys (we don't have them!)
 */
export const listApiKeys = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Add status field for clarity
    const keysWithStatus = apiKeys.map((key: any) => ({
      ...key,
      status:
        key.expiresAt < new Date()
          ? 'expired'
          : key.isActive
          ? 'active'
          : 'revoked',
    }));

    res.json({
      success: true,
      data: {
        keys: keysWithStatus,
        total: keysWithStatus.length,
        active: keysWithStatus.filter((k: any) => k.status === 'active').length,
      },
    });
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list API keys',
    });
  }
};

/**
 * DELETE /keys/:id/revoke
 * Revoke (deactivate) an API key
 * WHY: Allow users to immediately disable compromised keys
 */
export const revokeApiKey = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const keyId = req.params.id;

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        userId,
      },
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found',
      });
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke API key',
    });
  }
};
