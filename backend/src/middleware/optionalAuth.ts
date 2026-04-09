import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt.js';

/**
 * אם יש Bearer תקין — ממלא req.user; אחרת ממשיך ללא משתמש (חישוב ציבורי).
 * טוקן לא תקין — מתעלמים (לא חוסמים את החישוב).
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token);
  } catch {
    // אנונימי
  }
  next();
}
