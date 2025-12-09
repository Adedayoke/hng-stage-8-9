// Authentication Controller
// WHY: Handle Google OAuth login flow and JWT generation

import { Request, Response } from 'express';
import { generateToken } from '../utils/jwt';

/**
 * GET /auth/google
 * Initiates Google OAuth flow
 * WHY: Redirect user to Google consent screen
 */
export const googleAuth = () => {
  // Passport middleware handles the redirect
  // This is just a placeholder
};

/**
 * GET /auth/google/callback
 * Handles Google OAuth callback
 * 
 * Flow:
 * 1. Passport validates Google response
 * 2. User is created/found in database (done in passport strategy)
 * 3. Generate JWT token
 * 4. Return token to client
 */
export const googleCallback = async (req: Request, res: Response) => {
  try {
    // User is attached by Passport after successful authentication
    const user = req.user as any;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Return token and user info
    // Frontend will store this token and send it in Authorization header
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
        },
      },
    });
  } catch (error) {
    console.error('Google callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};
