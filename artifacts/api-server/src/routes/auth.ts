import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import { randomBytes } from 'crypto';
import rateLimit from 'express-rate-limit';
import { db, staff, sessions } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { logger } from '../lib/logger.js';
import { requireSession, invalidateSession } from '../middlewares/requireSession.js';
import { getClientIp } from '../middlewares/auth.js';
import { asyncHandler, AppError } from '../middlewares/errorHandler.js';
import config from '../config.js';

const router: Router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts — try again in 15 minutes' },
});

const loginSchema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
});

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = loginSchema.parse(req.body);
    const clientIp = getClientIp(req);

    const [user] = await db
      .select()
      .from(staff)
      .where(eq(staff.username, username))
      .limit(1);

    // Always run bcrypt regardless of whether the user was found.
    // Skipping it when user is absent creates a timing difference that lets
    // attackers enumerate valid usernames (~1ms vs ~100ms response).
    const DUMMY_HASH = '$2a$12$invalidhashfortimingnormalization000000000000000000000u';
    const passwordMatch = await bcryptjs.compare(password, user?.password_hash ?? DUMMY_HASH);

    if (!user || !user.active || !passwordMatch) {
      logger.warn(`Login failed: ${username} from ${clientIp}`);
      throw new AppError(401, 'Invalid username or password');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + config.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000);

    await db.insert(sessions).values({
      token,
      staff_id: user.id,
      expires_at: expiresAt,
      ip_address: clientIp,
      user_agent: req.headers['user-agent'],
    });

    await db.update(staff).set({ last_login: new Date() }).where(eq(staff.id, user.id));

    logger.info(`Login: ${username} from ${clientIp}`);

    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: config.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000,
    });

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      staff_id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    });
  })
);

router.post(
  '/logout',
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies.session as string | undefined;
    if (token) {
      await db.delete(sessions).where(eq(sessions.token, token));
      invalidateSession(token);
      logger.info(`Logout: ${req.staff?.username}`);
    }
    res.clearCookie('session');
    res.setHeader('Cache-Control', 'no-store');
    res.json({ message: 'Logged out successfully' });
  })
);

router.get(
  '/me',
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      staff_id: req.staff?.staffId,
      username: req.staff?.username,
      full_name: req.staff?.fullName,
      role: req.staff?.role,
    });
  })
);

export default router;
