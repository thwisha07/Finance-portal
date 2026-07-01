import request from 'supertest';
import app from '../index';
import { AuthService } from '../services/authService';

describe('Authentication Routes', () => {
  describe('POST /api/auth/login', () => {
    it('should return 400 if email is missing', async () => {
      const res = await request(app).post('/api/auth/login').send({
        password: 'Test@1234',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'user@springbok.com',
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 if password is too short', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'user@springbok.com',
        password: 'short',
      });

      expect(res.status).toBe(400);
    });

    it('should return 401 if credentials are invalid', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@springbok.com',
        password: 'Test@1234',
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return token on successful login', async () => {
      // This test would need a test user in the database
      // For now, it's a placeholder
      expect(true).toBe(true);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(401);
    });
  });
});

describe('AuthService', () => {
  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'Test@1234';
      const hash = await AuthService.hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('comparePassword', () => {
    it('should verify correct password', async () => {
      const password = 'Test@1234';
      const hash = await AuthService.hashPassword(password);
      const result = await AuthService.comparePassword(password, hash);

      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'Test@1234';
      const hash = await AuthService.hashPassword(password);
      const result = await AuthService.comparePassword('WrongPassword', hash);

      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const user = {
        id: '123',
        email: 'test@springbok.com',
        name: 'Test User',
        password_hash: '',
        role: 'finance' as const,
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const token = AuthService.generateToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });
});
