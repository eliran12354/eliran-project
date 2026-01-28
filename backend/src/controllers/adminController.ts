import type { Request, Response } from 'express';
import { listUsers } from '../services/authService.js';

export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (e: unknown) {
    console.error('Admin getUsers error:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
}
