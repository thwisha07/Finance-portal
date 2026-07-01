import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { User } from '../types';
import logger from '../config/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '30m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

/**
 * Authentication service
 */
export class AuthService {
  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  static generateToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        department: user.department,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRY }
    );
  }

  /**
   * Find user by email
   */
  static async findUserByEmail(email: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, name, password_hash, role, department, active, last_login, created_at, updated_at
       FROM users WHERE email = $1 AND active = true`,
      [email.toLowerCase()]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  static async findUserById(id: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, name, password_hash, role, department, active, last_login, created_at, updated_at
       FROM users WHERE id = $1 AND active = true`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Create new user
   */
  static async createUser(email: string, name: string, password: string, role: string, department?: string): Promise<User> {
    const id = uuidv4();
    const passwordHash = await this.hashPassword(password);

    const result = await query(
      `INSERT INTO users (id, email, name, password_hash, role, department, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
       RETURNING id, email, name, password_hash, role, department, active, created_at, updated_at`,
      [id, email.toLowerCase(), name, passwordHash, role, department]
    );

    logger.info(`User created: ${email} with role ${role}`);
    return result.rows[0];
  }

  /**
   * Update last login
   */
  static async updateLastLogin(userId: string): Promise<void> {
    await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [userId]);
  }
}
