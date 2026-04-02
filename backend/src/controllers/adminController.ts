import type { Request, Response } from 'express';
import { listUsers } from '../services/authService.js';
import { listContactSubmissions } from '../services/contactService.js';
import { getDashboardStats } from '../services/adminStatsService.js';

export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (e: unknown) {
    console.error('Admin getUsers error:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
}

export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (e: unknown) {
    console.error('Admin getStats error:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
}

export async function getContactSubmissions(req: Request, res: Response): Promise<void> {
  try {
    const submissions = await listContactSubmissions();
    res.json({ submissions });
  } catch (e: unknown) {
    console.error('Admin getContactSubmissions error:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch contact submissions' });
  }
}
