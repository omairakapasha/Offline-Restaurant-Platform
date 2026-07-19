import { Router, Request, Response } from 'express';
import { eq, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { db, tables, orders } from '@workspace/db';
import { requireSession } from '../middlewares/requireSession.js';
import { requireRole } from '../middlewares/requireRole.js';
import { asyncHandler, AppError } from '../middlewares/errorHandler.js';
import { writeAuditLog } from '../lib/auditLog.js';
import config from '../config.js';

const router: Router = Router();

router.get('/tables', requireSession, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const allTables = await db.select().from(tables).where(eq(tables.active, true));
  const base = config.CORS_ORIGIN.replace(/\/+$/, '');
  res.json(allTables.map((t: any) => ({ ...t, qrUrl: `${base}/?t=${t.qr_token}` })));
}));

router.get('/tables/:id/qr', requireSession, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new AppError(400, 'Invalid id');

  const [table] = await db.select().from(tables).where(eq(tables.id, id)).limit(1);
  if (!table) throw new AppError(404, 'Table not found');

  const base = config.CORS_ORIGIN.replace(/\/+$/, '');
  const url = `${base}/?t=${table.qr_token}`;
  const png = await QRCode.toBuffer(url, { errorCorrectionLevel: 'M', width: 400, margin: 2 });

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(png);
}));

router.post('/tables', requireSession, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { tableNumber, capacity } = req.body;
  if (!tableNumber) throw new AppError(400, 'Table number is required');

  const [existing] = await db.select({ id: tables.id }).from(tables).where(eq(tables.table_number, tableNumber)).limit(1);
  if (existing) throw new AppError(409, 'Table number already exists');

  const qrToken = uuidv4();
  const [table] = await db.insert(tables).values({ table_number: tableNumber, capacity: capacity ?? 4, qr_token: qrToken }).returning();
  if (!table) throw new Error('Table insert returned no result');

  await writeAuditLog(req.staff?.staffId, 'table:created', 'table', String(table.id), { tableNumber: table.table_number, qrToken: table.qr_token }, req);

  const base = config.CORS_ORIGIN.replace(/\/+$/, '');
  res.status(201).json({ ...table, qrUrl: `${base}/?t=${qrToken}` });
}));

router.patch('/tables/:id', requireSession, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new AppError(400, 'Invalid id');

  const [existing] = await db.select().from(tables).where(eq(tables.id, id)).limit(1);
  if (!existing) throw new AppError(404, 'Table not found');

  const { tableNumber, capacity } = req.body;
  const updates: Partial<typeof tables.$inferInsert> = {};

  if (tableNumber !== undefined) {
    const [conflict] = await db.select({ id: tables.id }).from(tables).where(eq(tables.table_number, tableNumber)).limit(1);
    if (conflict && conflict.id !== id) throw new AppError(409, 'Table number already exists');
    updates.table_number = tableNumber;
  }
  if (capacity !== undefined) updates.capacity = capacity;
  if (Object.keys(updates).length === 0) throw new AppError(400, 'No fields to update');

  await db.update(tables).set(updates).where(eq(tables.id, id));
  await writeAuditLog(req.staff?.staffId, 'table:updated', 'table', String(id), { changes: { tableNumber, capacity } }, req);
  res.json({ message: 'Table updated' });
}));

router.post('/tables/:id/rotate-qr', requireSession, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new AppError(400, 'Invalid id');

  const [existing] = await db.select().from(tables).where(eq(tables.id, id)).limit(1);
  if (!existing) throw new AppError(404, 'Table not found');

  const newToken = uuidv4();
  await db.update(tables).set({ qr_token: newToken }).where(eq(tables.id, id));
  await writeAuditLog(req.staff?.staffId, 'table:qr_rotated', 'table', String(id), { tableNumber: existing.table_number, oldToken: existing.qr_token, newToken }, req);
  
  res.json({ message: 'QR token regenerated successfully' });
}));

router.delete('/tables/:id', requireSession, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new AppError(400, 'Invalid id');

  const [existing] = await db.select().from(tables).where(eq(tables.id, id)).limit(1);
  if (!existing) throw new AppError(404, 'Table not found');

  // Check if any orders reference this table — FK ON DELETE no action blocks hard delete.
  const [{ orderCount }] = await db
    .select({ orderCount: count(orders.id) })
    .from(orders)
    .where(eq(orders.table_id, id));

  if (Number(orderCount) === 0) {
    // No order history — safe to hard delete.
    await db.delete(tables).where(eq(tables.id, id));
    await writeAuditLog(req.staff?.staffId, 'table:deleted', 'table', String(id), { tableNumber: existing.table_number, type: 'hard' }, req);
    res.json({ message: 'Table deleted' });
  } else {
    // Orders exist — soft delete to preserve history.
    await db.update(tables).set({ active: false }).where(eq(tables.id, id));
    await writeAuditLog(req.staff?.staffId, 'table:deleted', 'table', String(id), { tableNumber: existing.table_number, type: 'soft', orderCount: Number(orderCount) }, req);
    res.json({ message: 'Table deleted', note: 'Table has order history and was deactivated to preserve records.' });
  }
}));

export default router;
