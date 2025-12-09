// Authentication Routes
// WHY: Handle Google OAuth login flow

import { Router } from 'express';
import passport from '../config/passport';
import { googleCallback } from '../controllers/authController';

const router = Router();

/**
 * GET /auth/google
 * Initiates Google OAuth flow
 */
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

/**
 * GET /auth/google/callback
 * Handles Google OAuth callback
 * Returns JWT token
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/google' }),
  googleCallback
);

export default router;
