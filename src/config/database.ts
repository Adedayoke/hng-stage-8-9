// Prisma Client Singleton
// WHY: We need ONE database connection shared across the app
// Creating multiple instances causes connection pool exhaustion

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Declare global type for TypeScript
declare global {
  var prisma: PrismaClient | undefined;
}

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Create or reuse Prisma client
// In development: reuse connection across hot reloads
// In production: create fresh connection
export const prisma = global.prisma || new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Store in global to prevent multiple instances during hot reload
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
