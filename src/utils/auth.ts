// Authentication Types and Helpers
// WHY: Helper to safely access user from request

import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Get authenticated user from request
 * WHY: Type-safe accessor for req.user set by our auth middleware
 */
export function getAuthenticatedUser(req: Request): AuthenticatedUser {
  return (req as any).user;
}
