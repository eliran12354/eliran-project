import bcrypt from 'bcrypt';
import { query, queryOne, execute } from '../config/database.js';

const SALT_ROUNDS = 12;

export type UserRecord = {
  id: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
};

export type UserPublic = {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
};

export async function createUser(
  email: string,
  password: string,
  role: 'user' | 'admin' = 'user'
): Promise<UserPublic> {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const normalisedEmail = email.toLowerCase().trim();
  try {
    const user = await queryOne<UserPublic>(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
      [normalisedEmail, password_hash, role]
    );
    if (!user) throw new Error('Insert failed');
    return user;
  } catch (err) {
    if (err && typeof err === 'object' && (err as { code?: string }).code === '23505') {
      throw new Error('Email already registered');
    }
    throw err;
  }
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const normalisedEmail = email.toLowerCase().trim();
  return queryOne<UserRecord>(
    `SELECT id, email, password_hash, role, created_at, updated_at
     FROM users
     WHERE email = $1`,
    [normalisedEmail]
  );
}

export async function validatePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function listUsers(): Promise<UserPublic[]> {
  return query<UserPublic>(
    `SELECT id, email, role, created_at
     FROM users
     ORDER BY created_at DESC`
  );
}

export async function updatePasswordForUser(userId: string, plainPassword: string): Promise<void> {
  const password_hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  await execute(`UPDATE users SET password_hash = $1 WHERE id = $2`, [password_hash, userId]);
}
