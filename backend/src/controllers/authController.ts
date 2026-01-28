import type { Request, Response } from 'express';
import {
  createUser,
  findUserByEmail,
  validatePassword,
} from '../services/authService.js';
import { createToken } from '../lib/jwt.js';
import { config } from '../config/env.js';

const MIN_PASSWORD_LENGTH = 8;

export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password || typeof password !== 'string') {
      res.status(400).json({ success: false, error: 'Email and password required' });
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({
        success: false,
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
      return;
    }

    const user = await createUser(email, password, 'user');
    const token = createToken({ sub: user.id, email: user.email, role: user.role });

    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    if (err.message === 'Email already registered') {
      res.status(409).json({ success: false, error: err.message });
      return;
    }
    console.error('Signup error:', e);
    const devHint =
      config.server.nodeEnv === 'development' && err.message
        ? `Registration failed: ${err.message}`
        : 'Registration failed';
    res.status(500).json({ success: false, error: devHint });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password required' });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const ok = await validatePassword(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const token = createToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error('Login error:', e);
    const devHint =
      config.server.nodeEnv === 'development' && err.message
        ? `Login failed: ${err.message}`
        : 'Login failed';
    res.status(500).json({ success: false, error: devHint });
  }
}
