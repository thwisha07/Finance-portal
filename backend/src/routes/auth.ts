import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AuthService } from '../services/authService';
import { AuditLogService } from '../services/auditLogService';
import { validate, schemas } from '../middleware/validation';
import { verifyJWT, captureRequestMetadata } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../config/logger';

const router = Router();

/**
 * Login endpoint
 */
router.post(
  '/login',
  captureRequestMetadata,
  validate(
    Joi.object({
      email: schemas.email,
      password: schemas.password,
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Find user
    const user = await AuthService.findUserByEmail(email);
    if (!user) {
      // Log failed attempt
      await AuditLogService.log({
        user_id: 'unknown',
        user_email: email,
        action: 'LOGIN_FAILED',
        resource_type: 'USER',
        ip_address: req.clientIp,
        user_agent: req.userAgent,
        status: 'FAILURE',
        error_message: 'User not found',
      });

      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password
    const isPasswordValid = await AuthService.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      // Log failed attempt
      await AuditLogService.log({
        user_id: user.id,
        user_email: user.email,
        action: 'LOGIN_FAILED',
        resource_type: 'USER',
        ip_address: req.clientIp,
        user_agent: req.userAgent,
        status: 'FAILURE',
        error_message: 'Invalid password',
      });

      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update last login
    await AuthService.updateLastLogin(user.id);

    // Generate tokens
    const token = AuthService.generateToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);

    // Log successful login
    await AuditLogService.log({
      user_id: user.id,
      user_email: user.email,
      action: 'LOGIN_SUCCESS',
      resource_type: 'USER',
      ip_address: req.clientIp,
      user_agent: req.userAgent,
      status: 'SUCCESS',
    });

    logger.info(`User logged in: ${user.email}`);

    // Return tokens and user info
    res.status(200).json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
      },
    });
  })
);

/**
 * Logout endpoint
 */
router.post('/logout', verifyJWT, captureRequestMetadata, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  // Log logout
  await AuditLogService.log({
    user_id: req.user.id,
    user_email: req.user.email,
    action: 'LOGOUT',
    resource_type: 'USER',
    ip_address: req.clientIp,
    user_agent: req.userAgent,
    status: 'SUCCESS',
  });

  logger.info(`User logged out: ${req.user.email}`);
  res.status(200).json({ message: 'Logged out successfully' });
}));

/**
 * Refresh token endpoint
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }

  try {
    const decoded = await new Promise<any>((resolve, reject) => {
      const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
      const jwt = require('jsonwebtoken');
      jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err: any, decoded: any) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });

    // Get user
    const user = await AuthService.findUserById(decoded.id);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Generate new token
    const newToken = AuthService.generateToken(user);

    res.status(200).json({ token: newToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}));

export default router;
