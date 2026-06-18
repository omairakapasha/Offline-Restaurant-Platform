import { Router, Request, Response, NextFunction } from 'express';
import { eq, count, desc, inArray, sql, gte, ne, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db, staff, sessions, orders, order_items, tables, menu_items, order_status_history, audit_log } from '@workspace/db';
import { requireSession } from '../middlewares/requireSession.js';
import { requireRole } from '../middlewares/requireRole.js';
import { writeAuditLog } from '../lib/auditLog.js';

export { writeAuditLog };

const router: Router = Router();

// Admin — get single staff member
router.get('/staff/:id', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
    const [member] = await db
      .select({
        id: staff.id,
        username: staff.username,
        fullName: staff.full_name,
        role: staff.role,
        active: staff.active,
        lastLogin: staff.last_login,
      })
      .from(staff)
      .where(eq(staff.id, id))
      .limit(1);
    if (!member) { res.status(404).json({ error: 'Staff member not found' }); return; }
    res.json(member);
  } catch (err) {
    next(err);
  }
});

// Admin — list staff
router.get('/staff', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await db
      .select({
        id: staff.id,
        username: staff.username,
        fullName: staff.full_name,
        role: staff.role,
        active: staff.active,
        lastLogin: staff.last_login,
      })
      .from(staff);
    res.json(members);
  } catch (err) {
    next(err);
  }
});

// Admin — create staff
router.post('/staff', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, fullName, role } = req.body;
    
    if (!username || !password || !fullName || !role) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (!['admin', 'kitchen', 'waiter'].includes(role)) {
      res.status(400).json({ error: 'role must be admin, kitchen, or waiter' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const [existing] = await db
      .select({ id: staff.id })
      .from(staff)
      .where(eq(staff.username, username))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [member] = await db
      .insert(staff)
      .values({
        username,
        password_hash: passwordHash,
        full_name: fullName,
        role: role as 'admin' | 'kitchen' | 'waiter',
      })
      .returning({
        id: staff.id,
        username: staff.username,
        fullName: staff.full_name,
        role: staff.role,
        active: staff.active,
      });

    if (!member) throw new Error('Staff insert returned no result');

    await writeAuditLog(req.staff?.staffId, 'staff:created', 'staff', String(member.id), {
      username: member.username,
      role: member.role,
    }, req);

    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
});

// Admin — update staff / reset password
router.patch('/staff/:id', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    const { fullName, role, active, newPassword } = req.body;

    const [existing] = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Staff member not found' }); return; }

    const updates: Partial<typeof staff.$inferInsert> = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;
    if (newPassword) {
      if (newPassword.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }
      updates.password_hash = await bcrypt.hash(newPassword, 12);
      // Invalidate all sessions for this staff member
      await db.delete(sessions).where(eq(sessions.staff_id, id));
    }

    await db.update(staff).set(updates).where(eq(staff.id, id));

    await writeAuditLog(req.staff?.staffId, 'staff:updated', 'staff', String(id), {
      changes: { fullName, role, active, newPassword: newPassword ? '[redacted]' : undefined },
    }, req);

    res.json({ message: 'Staff member updated' });
  } catch (err) {
    next(err);
  }
});

// Admin — delete (deactivate) staff member
router.delete('/staff/:id', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    const [existing] = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Staff member not found' }); return; }

    await db.update(staff).set({ active: false }).where(eq(staff.id, id));
    await db.delete(sessions).where(eq(sessions.staff_id, id));

    await writeAuditLog(req.staff?.staffId, 'staff:deactivated', 'staff', String(id), {
      username: existing.username,
    }, req);

    res.json({ message: 'Staff member deactivated' });
  } catch (err) {
    next(err);
  }
});

// Admin — all orders with table number and item count
router.get('/admin/orders', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200);
    const offset = parseInt(String(req.query.offset ?? '0'), 10);

    const allOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        createdAt: orders.created_at,
        totalAmount: orders.total_amount,
        tableNumber: tables.table_number,
      })
      .from(orders)
      .leftJoin(tables, eq(orders.table_id, tables.id))
      .orderBy(desc(orders.created_at))
      .limit(limit)
      .offset(offset);

    if (!allOrders.length) { res.json([]); return; }

    const orderIds = allOrders.map(o => o.id);
    const itemCounts = await db
      .select({ orderId: order_items.order_id, itemCount: count(order_items.id) })
      .from(order_items)
      .where(inArray(order_items.order_id, orderIds))
      .groupBy(order_items.order_id);

    const countMap: Record<string, number> = {};
    for (const row of itemCounts) countMap[row.orderId] = Number(row.itemCount);

    res.json(allOrders.map(o => ({ ...o, itemCount: countMap[o.id] ?? 0 })));
  } catch (err) {
    next(err);
  }
});

// Admin — all menu items including archived
router.get('/admin/menu', requireSession, requireRole('admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await db.select().from(menu_items);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// Admin — analytics
router.get('/admin/analytics', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Math.min(parseInt(String(req.query.days ?? '7'), 10), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const revenueByDay = await db
      .select({
        date: sql<string>`DATE(${orders.created_at})`,
        revenue: sql<string>`SUM(${orders.total_amount})`,
        orderCount: count(orders.id),
      })
      .from(orders)
      .where(gte(orders.created_at, since))
      .groupBy(sql`DATE(${orders.created_at})`)
      .orderBy(sql`DATE(${orders.created_at})`);

    const popularItems = await db
      .select({
        name: menu_items.name,
        quantity: sql<string>`SUM(${order_items.quantity})`,
        orderCount: count(order_items.id),
      })
      .from(order_items)
      .innerJoin(menu_items, eq(order_items.menu_item_id, menu_items.id))
      .groupBy(menu_items.id, menu_items.name)
      .orderBy(sql`SUM(${order_items.quantity}) DESC`)
      .limit(8);

    // Staff performance: orders prepared and avg prep time per staff member
    const staffPerf = await db.execute<{
      staff_name: string; orders_prepared: string; avg_prep_min: string | null;
    }>(sql`
      SELECT s.full_name AS staff_name,
             COUNT(DISTINCT p.order_id)::text AS orders_prepared,
             ROUND(AVG(EXTRACT(EPOCH FROM (r.changed_at - p.changed_at)) / 60))::text AS avg_prep_min
      FROM ${order_status_history} p
      JOIN ${order_status_history} r
        ON r.order_id = p.order_id AND r.to_status = 'ready'
      JOIN ${staff} s ON s.id = r.changed_by
      WHERE p.to_status = 'preparing'
        AND p.changed_at >= ${since}
      GROUP BY s.id, s.full_name
      ORDER BY orders_prepared DESC
      LIMIT 10
    `);

    res.json({ revenueByDay, popularItems, staffPerformance: staffPerf.rows, days });
  } catch (err) {
    next(err);
  }
});

// Admin — audit log
router.get('/audit-log', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '100'), 10), 500);
    const offset = parseInt(String(req.query.offset ?? '0'), 10);

    const entries = await db
      .select({
        id: audit_log.id,
        staffId: audit_log.staff_id,
        staffName: staff.full_name,
        action: audit_log.action,
        entityType: audit_log.entity_type,
        entityId: audit_log.entity_id,
        details: audit_log.details,
        ipAddress: audit_log.ip_address,
        timestamp: audit_log.timestamp,
      })
      .from(audit_log)
      .leftJoin(staff, eq(audit_log.staff_id, staff.id))
      .orderBy(desc(audit_log.timestamp))
      .limit(limit)
      .offset(offset);

    res.json(entries);
  } catch (err) {
    next(err);
  }
});

// Admin — inventory: menu items with finite stock, sorted by quantity asc
router.get('/admin/inventory', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await db
      .select({
        id: menu_items.id,
        name: menu_items.name,
        category: menu_items.category,
        stockQuantity: menu_items.stock_quantity,
        available: menu_items.available,
        archived: menu_items.archived,
      })
      .from(menu_items)
      .where(and(ne(menu_items.stock_quantity, -1), eq(menu_items.archived, false)))
      .orderBy(menu_items.stock_quantity, menu_items.name);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// --- CSV helper ---
function buildCSV(headers: string[], rows: unknown[][]): string {
  const esc = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  return [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n');
}

function csvResponse(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

// Admin — export orders CSV
router.get('/admin/export/orders', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(String(req.query.days ?? '30'), 10);
    const whereClause = days > 0
      ? (() => { const s = new Date(); s.setDate(s.getDate() - days); s.setHours(0,0,0,0); return gte(orders.created_at, s); })()
      : undefined;

    const allOrders = await db
      .select({
        id: orders.id, status: orders.status,
        customerName: orders.customer_name, customerPhone: orders.customer_phone,
        totalAmount: orders.total_amount, tableNumber: tables.table_number,
        createdAt: orders.created_at,
      })
      .from(orders)
      .leftJoin(tables, eq(orders.table_id, tables.id))
      .where(whereClause)
      .orderBy(desc(orders.created_at));

    const itemsByOrder: Record<string, string> = {};
    if (allOrders.length) {
      const itemRows = await db
        .select({ orderId: order_items.order_id, name: menu_items.name, quantity: order_items.quantity })
        .from(order_items)
        .innerJoin(menu_items, eq(order_items.menu_item_id, menu_items.id))
        .where(inArray(order_items.order_id, allOrders.map(o => o.id)));
      for (const i of itemRows) {
        const s = `${i.name} ×${i.quantity}`;
        itemsByOrder[i.orderId] = itemsByOrder[i.orderId] ? itemsByOrder[i.orderId] + ', ' + s : s;
      }
    }

    const headers = ['Order ID', 'Table', 'Customer Name', 'Customer Phone', 'Status', 'Items', 'Total (Rs.)', 'Placed At'];
    const rows = allOrders.map(o => [
      o.id, o.tableNumber ?? '', o.customerName ?? '', o.customerPhone ?? '',
      o.status, itemsByOrder[o.id] ?? '',
      parseFloat(String(o.totalAmount)).toFixed(2),
      o.createdAt?.toISOString() ?? '',
    ]);

    csvResponse(res, `orders-${new Date().toISOString().slice(0,10)}.csv`, buildCSV(headers, rows));
  } catch (err) { next(err); }
});

// Admin — export audit log CSV
router.get('/admin/export/audit-log', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entries = await db
      .select({
        id: audit_log.id, staffName: staff.full_name,
        action: audit_log.action, entityType: audit_log.entity_type,
        entityId: audit_log.entity_id, details: audit_log.details,
        ipAddress: audit_log.ip_address, timestamp: audit_log.timestamp,
      })
      .from(audit_log)
      .leftJoin(staff, eq(audit_log.staff_id, staff.id))
      .orderBy(desc(audit_log.timestamp))
      .limit(5000);

    const headers = ['ID', 'Staff', 'Action', 'Entity Type', 'Entity ID', 'Details', 'IP Address', 'Timestamp'];
    const rows = entries.map(e => [
      e.id, e.staffName ?? 'System', e.action, e.entityType,
      e.entityId, e.details ?? '', e.ipAddress ?? '',
      e.timestamp?.toISOString() ?? '',
    ]);

    csvResponse(res, `audit-log-${new Date().toISOString().slice(0,10)}.csv`, buildCSV(headers, rows));
  } catch (err) { next(err); }
});

// Admin — export menu CSV
router.get('/admin/export/menu', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await db.select().from(menu_items).orderBy(menu_items.category, menu_items.name);

    const headers = ['ID', 'Name', 'Category', 'Price (Rs.)', 'Description', 'Prep Time (min)', 'Vegetarian', 'Spice Level', 'Allergens', 'Popular', 'Available', 'Archived'];
    const rows = items.map(i => [
      i.id, i.name, i.category,
      parseFloat(i.price).toFixed(2),
      i.description ?? '', i.prep_time,
      i.is_vegetarian ? 'Yes' : 'No', i.spice_level,
      (i.allergens ?? []).join('; '),
      i.popular ? 'Yes' : 'No',
      i.available ? 'Yes' : 'No',
      i.archived ? 'Yes' : 'No',
    ]);

    csvResponse(res, `menu-${new Date().toISOString().slice(0,10)}.csv`, buildCSV(headers, rows));
  } catch (err) { next(err); }
});

export default router;
