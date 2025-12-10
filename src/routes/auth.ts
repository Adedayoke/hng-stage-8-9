// Authentication Routes
// WHY: Handle Google OAuth login flow

import { Router } from 'express';
import passport from '../config/passport';
import { googleCallback } from '../controllers/authController';

const router = Router();

/**
 * @swagger
 * /auth/google:
 *   get:
 *     tags: [Authentication]
 *     summary: Initiate Google OAuth login
 *     description: Redirects to Google sign-in page
 *     responses:
 *       302:
 *         description: Redirects to Google OAuth
 */
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     tags: [Authentication]
 *     summary: Google OAuth callback
 *     description: Handles Google OAuth callback and returns JWT token
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT token
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *       401:
 *         description: Authentication failed
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/google' }),
  googleCallback
);

export default router;
