// Environment Configuration
// WHY: Centralize all environment variables with validation
// Prevents runtime errors from missing config

import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
  paystack: {
    secretKey: string;
    publicKey: string;
  };
  frontendUrl: string;
}

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'PAYSTACK_SECRET_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY!,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
