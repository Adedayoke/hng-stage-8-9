// Type Definitions
// WHY: Extend Express types for our authentication system

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
    }
    
    interface Request {
      user?: {
        id: string;
        email: string;
      };
      permissions?: string[];
      authType?: 'jwt' | 'apikey';
    }
  }
}

export {};
