// Authentication Middleware
// WHY: Protect routes - verify JWT or API Key before allowing access

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import prisma from '../config/database';
import bcrypt from 'bcrypt';

// Extend Express Request to include user and permissions
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
    };
    permissions?: string[];
    authType?: 'jwt' | 'apikey';
  }
}

/**
 * Authentication Middleware
 * Supports TWO authentication methods:
 * 1. JWT: Authorization: Bearer <token>
 * 2. API Key: x-api-key: <key>
 * 
 * WHY: Users use JWT, services use API keys
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    // Check for JWT authentication
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = verifyToken(token);
        
        // Verify user still exists
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'User not found',
          });
        }

        req.user = {
          id: user.id,
          email: user.email,
        };
        req.authType = 'jwt';
        req.permissions = ['*']; // JWT users have all permissions
        
        return next();
      } catch (error: any) {
        return res.status(401).json({
          success: false,
          message: error.message || 'Invalid token',
        });
      }
    }

    // Check for API Key authentication
    if (apiKey) {
      try {
        // Find all active API keys and compare hashes
        // WHY: Keys are hashed in DB, we need to compare with bcrypt
        const apiKeys = await prisma.apiKey.findMany({
          where: {
            isActive: true,
            expiresAt: {
              gt: new Date(), // Not expired
            },
          },
          include: {
            user: true,
          },
        });

        let matchedKey = null;

        // Compare provided key with hashed keys
        for (const key of apiKeys) {
          const isMatch = await bcrypt.compare(apiKey, key.keyHash);
          if (isMatch) {
            matchedKey = key;
            break;
          }
        }

        if (!matchedKey) {
          return res.status(401).json({
            success: false,
            message: 'Invalid or expired API key',
          });
        }

        req.user = {
          id: matchedKey.user.id,
          email: matchedKey.user.email,
        };
        req.authType = 'apikey';
        req.permissions = matchedKey.permissions;

        return next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'API key authentication failed',
        });
      }
    }

    // No authentication provided
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Provide JWT token or API key.',
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * Permission Check Middleware
 * WHY: API keys have limited permissions, we need to verify them
 * 
 * Usage: requirePermission('deposit') or requirePermission('transfer')
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // JWT users have all permissions
    if (req.authType === 'jwt') {
      return next();
    }

    // Check if API key has required permission
    if (!req.permissions?.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied. Required permission: ${permission}`,
      });
    }

    next();
  };
};
