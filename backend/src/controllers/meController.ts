import type { Request, Response } from 'express';

export function getMe(req: Request, res: Response): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  res.json({ user: req.user });
}
