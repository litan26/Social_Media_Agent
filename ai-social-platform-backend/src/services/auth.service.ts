import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../db/connection.js';
import { PLANS, type Plan } from '../config/plans.js';

export type UserRole = 'superadmin' | 'user';

export interface JWTPayload {
  userId: number;
  email: string;
  plan: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export class AuthService {
  static generateToken(userId: number, email: string, plan: string | null, role: UserRole): string {
    return jwt.sign(
      { userId, email, plan: role === 'superadmin' ? null : plan, role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRY || '7d' } as jwt.SignOptions
    );
  }

  static verifyToken(token: string): JWTPayload {
    return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private static isValidPhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }

  static async createUser(
    email: string,
    password: string,
    plan: Plan = 'free',
    role: UserRole = 'user',
    phone?: string
  ) {
    if (!PLANS.includes(plan)) throw new Error('Invalid plan');
    if (phone && !this.isValidPhone(phone)) throw new Error('Invalid phone number');

    const hashedPassword = await this.hashPassword(password);
    const insertResult = await pool.query(
      'INSERT INTO users (email, phone_number, password_hash, role, plan) VALUES ($1, $2, $3, $4, $5)',
      [email, phone ?? null, hashedPassword, role, plan]
    );
    const userId = insertResult.insertId!;
    await pool.query('INSERT INTO user_preferences (user_id) VALUES ($1)', [userId]);

    return this.getUserById(userId);
  }

  static async register(
    email: string,
    password: string,
    phone: string,
    plan: Plan = 'free'
  ): Promise<{ userId: number; token: string; email: string; plan: string; role: UserRole }> {
    if (!email || !password || !phone) {
      throw new Error('Email, phone number, and password are required');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    if (!this.isValidPhone(phone)) {
      throw new Error('Invalid phone number');
    }
    if (!PLANS.includes(plan)) throw new Error('Invalid plan');

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.trim()]);
    if (existing.rows.length > 0) {
      throw new Error('Email already registered');
    }

    const user = await this.createUser(email.trim(), password, plan, 'user', phone.trim());
    const token = this.generateToken(user.id, user.email, user.plan, 'user');
    return { userId: user.id, token, email: user.email, plan: user.plan, role: 'user' };
  }

  static async registerWithPayment(
    email: string,
    password: string,
    sessionId: string
  ): Promise<{ userId: number; token: string; email: string; plan: string; role: UserRole }> {
    const checkoutResult = await pool.query(
      'SELECT user_id, email FROM checkout_sessions WHERE stripe_session_id = $1 AND status = $2',
      [sessionId, 'open']
    );
    const checkout = checkoutResult.rows[0] as { user_id: number | null; email: string } | undefined;
    if (!checkout) {
      throw new Error('Invalid or expired checkout session');
    }
    if (checkout.email.toLowerCase() !== email.trim().toLowerCase()) {
      throw new Error('Email does not match checkout session');
    }

    let userId = checkout.user_id;
    if (!userId) {
      const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email.trim()]);
      userId = userResult.rows[0]?.id;
    }
    if (!userId) {
      throw new Error('User not found for checkout session');
    }

    const hashedPassword = await this.hashPassword(password);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2 AND email = $3', [
      hashedPassword,
      userId,
      email.trim(),
    ]);

    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    const role = (user.role || 'user') as UserRole;
    const token = this.generateToken(user.id, user.email, user.plan, role);
    return { userId: user.id, token, email: user.email, plan: user.plan, role };
  }

  static async login(
    email: string,
    password: string
  ): Promise<{ userId: number; token: string; email: string; plan: string | null; role: UserRole }> {
    const result = await pool.query(
      'SELECT id, email, password_hash, plan, role FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) throw new Error('User not found');

    const user = result.rows[0];
    const passwordMatch = await this.verifyPassword(password, user.password_hash);
    if (!passwordMatch) throw new Error('Invalid password');

    const role = (user.role || 'user') as UserRole;
    const plan = role === 'superadmin' ? null : (user.plan || 'free');
    const token = this.generateToken(user.id, user.email, plan, role);
    return { userId: user.id, token, email: user.email, plan, role };
  }

  static async listUsers() {
    const result = await pool.query(
      `SELECT id, email, phone_number, role, plan, industry, business_type, created_at
       FROM users
       WHERE role = 'user'
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  static async updateProfile(
    userId: number,
    data: {
      industry?: string;
      business_type?: string;
      voice_tone_preference?: Record<string, unknown>;
      logo_url?: string;
    }
  ) {
    await pool.query(
      `UPDATE users SET
        industry = COALESCE($1, industry),
        business_type = COALESCE($2, business_type),
        voice_tone_preference = COALESCE($3, voice_tone_preference),
        logo_url = COALESCE($4, logo_url),
        updated_at = NOW()
       WHERE id = $5`,
      [
        data.industry ?? null,
        data.business_type ?? null,
        data.voice_tone_preference ? JSON.stringify(data.voice_tone_preference) : null,
        data.logo_url ?? null,
        userId,
      ]
    );
    return this.getUserById(userId);
  }

  static async updatePlan(userId: number, plan: Plan) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');
    if (user.role === 'superadmin') throw new Error('Administrators are not assigned a plan');
    if (!PLANS.includes(plan)) throw new Error('Invalid plan');
    if (plan !== 'free') {
      throw new Error('Paid plans require Stripe checkout. Use POST /api/payment/upgrade-plan');
    }
    await pool.query('UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2', [plan, userId]);
    const updatedUser = await this.getUserById(userId);
    const token = this.generateToken(updatedUser.id, updatedUser.email, updatedUser.plan, updatedUser.role);
    return { user: updatedUser, token };
  }

  static async getUserById(userId: number) {
    const result = await pool.query(
      `SELECT id, email, phone_number, role, plan, industry, business_type, voice_tone_preference, logo_url, created_at
       FROM users WHERE id = $1`,
      [userId]
    );
    const row = result.rows[0];
    if (row?.voice_tone_preference && typeof row.voice_tone_preference === 'string') {
      row.voice_tone_preference = JSON.parse(row.voice_tone_preference);
    }
    if (row && !row.role) {
      row.role = 'user';
    }
    if (row?.role === 'superadmin') {
      row.plan = null;
    }
    return row;
  }
}
