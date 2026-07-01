import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../config/logger';
import { JWTPayload } from '../types/express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Verify JWT token and attach user to request
 */
export const verifyJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
    } else {
      res.status(401).json({ error: 'Authentication failed' });
    }
  }
};

/**
 * Require specific role
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user ${req.user?.email} for role ${roles.join(', ')}`);
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
};

/**
 * Require finance role (finance or senior_finance)
 */
export const requireFinanceRole = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || (req.user.role !== 'finance' && req.user.role !== 'senior_finance')) {
    res.status(403).json({ error: 'Finance access required' });
    return;
  }
  next();
};

/**
 * Require senior finance role (CFO level)
 */
export const requireSeniorFinance = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'senior_finance') {
    logger.warn(`Unauthorized senior finance access attempt by user ${req.user?.email}`);
    res.status(403).json({ error: 'Senior finance access required' });
    return;
  }
  next();
};

/**
 * Capture client IP and user agent for audit logging
 */
export const captureRequestMetadata = (req: Request, res: Response, next: NextFunction): void => {
  req.clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  req.userAgent = req.get('user-agent') || 'unknown';
  next();
};
