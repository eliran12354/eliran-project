const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';
const TOKEN_KEY = 'auth_token';

export type AuthUser = {
  id: string;
  email: string;
  role: 'user' | 'admin';
};

export type AuthResponse = {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
};

export type MeResponse = {
  user: { sub: string; email: string; role: 'user' | 'admin' };
};

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function signup(email: string, password: string): Promise<AuthResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as AuthResponse & { message?: string };
    if (!res.ok) {
      return { success: false, error: data.error || data.message || 'Registration failed' };
    }
    return { success: true, token: data.token, user: data.user };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || 'Network error' };
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as AuthResponse & { message?: string };
    if (!res.ok) {
      return { success: false, error: data.error || data.message || 'Login failed' };
    }
    return { success: true, token: data.token, user: data.user };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || 'Network error' };
  }
}

export async function getMe(token: string): Promise<{ success: true; user: AuthUser } | { success: false; error: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as MeResponse & { success?: boolean; error?: string };
    if (!res.ok) {
      return { success: false, error: data.error || 'Unauthorized' };
    }
    const u = data.user;
    return {
      success: true,
      user: { id: u.sub, email: u.email, role: u.role },
    };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || 'Network error' };
  }
}
