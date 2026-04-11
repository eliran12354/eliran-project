import type { Request, Response, NextFunction } from 'express';

const WINDOW_MS = 15 * 60 * 1000;
const MAX = 8;
const buckets = new Map<string, number[]>();

function clientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]
        : req.socket.remoteAddress || 'unknown';
  return ip;
}

export function forgotPasswordRateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = clientKey(req);
  const now = Date.now();
  const arr = buckets.get(key) ?? [];
  const fresh = arr.filter((t) => now - t < WINDOW_MS);
  if (fresh.length >= MAX) {
    res.status(429).json({ success: false, error: 'Too many requests. Try again later.' });
    return;
  }
  fresh.push(now);
  buckets.set(key, fresh);
  next();
}
