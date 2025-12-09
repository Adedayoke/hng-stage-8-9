// JWT Token Utilities
// WHY: Generate and verify JWT tokens for authentication

import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Generate JWT token for authenticated user
 * WHY: Stateless authentication - no server-side session needed
 * 
 * Token contains: userId, email
 * Token expires in: 7 days (configurable)
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

/**
 * Verify and decode JWT token
 * WHY: Validate token signature and expiry
 * Returns decoded payload or throws error
 */
export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
}
