import bcrypt from 'bcrypt';
import { supabase } from '../config/database.js';

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
  const { data, error } = await supabase
    .from('users')
    .insert({ email: normalisedEmail, password_hash, role })
    .select('id, email, role, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Email already registered');
    }
    throw error;
  }
  return data as UserPublic;
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const normalisedEmail = email.toLowerCase().trim();
  const { data, error } = await supabase
    .from('users')
    .select('id, email, password_hash, role, created_at, updated_at')
    .eq('email', normalisedEmail)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }
  return data as UserRecord;
}

export async function validatePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function listUsers(): Promise<UserPublic[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as UserPublic[];
}
