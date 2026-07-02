import { Router, Request, Response, NextFunction } from 'express';
import { gte, count, sum, inArray, eq, and, sql } from 'drizzle-orm';
import { db, orders } from '@workspace/db';
import { requireSession } from '../middlewares/requireSession.js';
import { requireRole } from '../middlewares/requireRole.js';

const router: Router = Router();

// KITCHEN/ADMIN — daily stats
router.get('/stats', requireSession, requireRole('kitchen'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Order volume counts every order placed today regardless of outcome.
    const [ordersToday] = await db
      .select({ totalOrders: count(orders.id) })
      .from(orders)
      .where(gte(orders.created_at, startOfDay));

    // Revenue only counts completed (served) orders — cancelled/in-progress
    // orders haven't earned money and must not inflate the figure.
    const [revenueToday] = await db
      .select({ totalRevenue: sum(orders.total_amount) })
      .from(orders)
      .where(and(gte(orders.created_at, startOfDay), eq(orders.status, 'served')));

    const [activeCount] = await db
      .select({ active: count(orders.id) })
      .from(orders)
      .where(inArray(orders.status, ['received', 'preparing', 'ready']));

    // Average time from 'preparing' to 'ready' over last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const prepAvgResult = await db.execute<{ avg_minutes: string | null }>(
      sql`SELECT ROUND(AVG(EXTRACT(EPOCH FROM (r.changed_at - p.changed_at)) / 60))::text AS avg_minutes
          FROM order_status_history p
          JOIN order_status_history r ON r.order_id = p.order_id
          WHERE p.to_status = 'preparing'
            AND r.to_status = 'ready'
            AND p.changed_at >= ${sevenDaysAgo}`
    );
    const prepAvg = prepAvgResult.rows[0];

    // Revenue is a business figure — kitchen staff get operational counts only;
    // admins additionally see the money number.
    const isAdmin = req.staff?.role === 'admin';

    res.json({
      totalOrders: ordersToday.totalOrders ?? 0,
      ...(isAdmin ? { totalRevenue: revenueToday.totalRevenue ?? '0' } : {}),
      activeOrders: activeCount.active ?? 0,
      avgPrepTimeMinutes: prepAvg?.avg_minutes ? parseInt(prepAvg.avg_minutes) : null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
