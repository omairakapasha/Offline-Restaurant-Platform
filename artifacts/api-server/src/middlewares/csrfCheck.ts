import type { Request, Response, NextFunction } from 'express';

export function csrfCheck(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next(); return;
  }
  const origin = req.headers['origin'];
  if (!origin) { next(); return; } // server-to-server / curl — no origin header
  const host = req.get('host') ?? '';
  if (origin !== `http://${host}` && origin !== `https://${host}`) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}
