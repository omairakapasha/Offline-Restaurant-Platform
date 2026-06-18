import type { Request, Response, NextFunction } from 'express';
import { eq, and, gt } from 'drizzle-orm';
import { db, sessions, staff } from '@workspace/db';

export interface StaffSession {
  staffId: number;
  username: string;
  fullName: string;
  role: 'admin' | 'kitchen' | 'waiter';
  sessionId: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- canonical Express Request type augmentation
  namespace Express {
    interface Request {
      staff?: StaffSession;
    }
  }
}

// In-process session cache — reduces DB hits on high-frequency polling routes.
// TTL is intentionally short (60s) so deactivated accounts lose access quickly.
const CACHE_TTL_MS = 60_000;
const sessionCache = new Map<string, { data: StaffSession; expiresAt: number }>();

let pruneScheduled = false;
function schedulePrune() {
  if (pruneScheduled) return;
  pruneScheduled = true;
  setTimeout(() => {
    pruneScheduled = false;
    const now = Date.now();
    for (const [k, v] of sessionCache) {
      if (now > v.expiresAt) sessionCache.delete(k);
    }
  }, CACHE_TTL_MS);
}

export function invalidateSession(token: string) {
  sessionCache.delete(token);
}

export async function requireSession(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.session as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const cached = sessionCache.get(token);
  if (cached && Date.now() < cached.expiresAt) {
    req.staff = cached.data;
    next();
    return;
  }

  try {
    const result = await db
      .select({
        sessionId: sessions.id,
        staffId: staff.id,
        username: staff.username,
        fullName: staff.full_name,
        role: staff.role,
        active: staff.active,
      })
      .from(sessions)
      .innerJoin(staff, eq(sessions.staff_id, staff.id))
      .where(and(eq(sessions.token, token), gt(sessions.expires_at, new Date())))
      .limit(1);

    const row = result[0];
    if (!row || !row.active) {
      res.clearCookie('session');
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }

    req.staff = {
      staffId: row.staffId,
      username: row.username,
      fullName: row.fullName,
      role: row.role as 'admin' | 'kitchen' | 'waiter',
      sessionId: row.sessionId,
    };

    sessionCache.set(token, { data: req.staff, expiresAt: Date.now() + CACHE_TTL_MS });
    schedulePrune();

    next();
  } catch (err) {
    next(err);
  }
}
