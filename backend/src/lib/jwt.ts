import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config/env.js';

export type JwtPayload = {
  sub: string;
  email: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
};

export function createToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const options: SignOptions = {
    expiresIn: config.jwt.expiry as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwt.secret, options);
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
  if (!decoded.sub || !decoded.email || !decoded.role) {
    throw new Error('Invalid token payload');
  }
  if (decoded.role !== 'user' && decoded.role !== 'admin') {
    throw new Error('Invalid role');
  }
  return decoded;
}
