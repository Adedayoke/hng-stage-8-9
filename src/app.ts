// Express Application Setup
// WHY: Configure Express server with all middleware and security

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from './config/passport';
import routes from './routes';

const app = express();

// Security middleware
// WHY: Helmet sets various HTTP headers for security
app.use(helmet());

// CORS configuration
// WHY: Allow frontend to make requests to our API
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  })
);

// Special handling for webhook - needs raw body
// MUST come before express.json()
app.use(
  '/wallet/paystack/webhook',
  express.raw({ type: 'application/json' })
);

// Body parsers for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());

// Routes
app.use('/', routes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

export default app;
