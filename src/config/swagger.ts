// Swagger Configuration
// WHY: API documentation with authentication support

import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Wallet Service API - Stage 9',
    version: '1.0.0',
    description: 'Secure wallet service with Paystack integration, JWT & API key authentication',
    contact: {
      name: 'HNG Stage 9',
    },
  },
  servers: [
    {
      url: process.env.NODE_ENV === 'production' 
        ? 'https://hng-stage-8-9-production.up.railway.app'
        : 'http://localhost:3000',
      description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token obtained from /auth/google/callback',
      },
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'Enter API key created via /keys/create endpoint',
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required or invalid token/API key',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false,
                },
                message: {
                  type: 'string',
                  example: 'Unauthorized',
                },
              },
            },
          },
        },
      },
      ValidationError: {
        description: 'Invalid request data',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false,
                },
                message: {
                  type: 'string',
                  example: 'Validation error',
                },
                errors: {
                  type: 'array',
                  items: {
                    type: 'object',
                  },
                },
              },
            },
          },
        },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            example: 'Error message',
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
          },
          data: {
            type: 'object',
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Authentication',
      description: 'Google OAuth endpoints',
    },
    {
      name: 'API Keys',
      description: 'API key management (requires JWT)',
    },
    {
      name: 'Wallet',
      description: 'Wallet operations (requires JWT or API Key)',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts', './dist/routes/*.js'], // Path to API routes
};

export const swaggerSpec = swaggerJsdoc(options);
