import type { Request, Response, NextFunction } from 'express';

const ROLE_LEVEL: Record<string, number> = {
  waiter: 1,
  kitchen: 2,
  admin: 3,
};

/**
 * Require a minimum role level.
 * Admin ≥ kitchen ≥ waiter
 */
export function requireRole(minimumRole: 'waiter' | 'kitchen' | 'admin') {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.staff?.role;
    if (!role || (ROLE_LEVEL[role] ?? 0) < (ROLE_LEVEL[minimumRole] ?? 99)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
