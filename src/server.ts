// Server Entry Point
// WHY: Start the Express server

import app from './app';
import { config } from './config/env';
import prisma from './config/database';

const PORT = config.port;

// Test database connection
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${config.nodeEnv}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}`);
    console.log('\n📋 Available endpoints:');
    console.log('  - GET  /health');
    console.log('  - GET  /auth/google');
    console.log('  - GET  /auth/google/callback');
    console.log('  - POST /keys/create');
    console.log('  - POST /keys/rollover');
    console.log('  - GET  /keys/list');
    console.log('  - POST /wallet/deposit');
    console.log('  - POST /wallet/paystack/webhook');
    console.log('  - GET  /wallet/deposit/:reference/status');
    console.log('  - GET  /wallet/balance');
    console.log('  - POST /wallet/transfer');
    console.log('  - GET  /wallet/transactions');
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, closing server...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
