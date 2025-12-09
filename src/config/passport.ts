// Google OAuth Strategy Configuration
// WHY: Passport strategy for Google OAuth 2.0 authentication

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './env';
import prisma from './database';
import { generateWalletNumber } from '../utils/wallet';
import { Prisma } from '@prisma/client';

/**
 * Configure Passport with Google OAuth Strategy
 * Flow:
 * 1. User redirects to Google
 * 2. User authorizes our app
 * 3. Google sends back profile data
 * 4. We find or create user
 * 5. Create wallet if new user
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user info from Google profile
        const email = profile.emails?.[0]?.value;
        const googleId = profile.id;
        const name = profile.displayName;
        const picture = profile.photos?.[0]?.value;

        if (!email) {
          return done(new Error('No email found in Google profile'), undefined);
        }

        // Find existing user or create new one
        let user = await prisma.user.findUnique({
          where: { googleId },
          include: { wallet: true },
        });

        if (!user) {
          // New user - create user AND wallet in a transaction
          // WHY TRANSACTION: Ensures both are created or neither
          user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const newUser = await tx.user.create({
              data: {
                email,
                googleId,
                name,
                picture,
              },
            });

            // Create wallet for new user
            await tx.wallet.create({
              data: {
                walletNumber: generateWalletNumber(),
                userId: newUser.id,
                balance: 0,
              },
            });

            // Return user with wallet
            return tx.user.findUnique({
              where: { id: newUser.id },
              include: { wallet: true },
            });
          });
        }

        return done(null, user || undefined);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

// Serialize user for session
// WHY: Store minimal user info in session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
