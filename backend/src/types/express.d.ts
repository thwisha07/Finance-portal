import { Request } from 'express';

export interface JWTPayload {
  id: string;
  email: string;
  role: 'po_owner' | 'receiver' | 'finance' | 'senior_finance';
  department?: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      clientIp?: string;
      userAgent?: string;
    }
  }
}
