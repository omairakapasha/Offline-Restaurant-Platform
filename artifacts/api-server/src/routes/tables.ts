import { Router, Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { db, tables } from '@workspace/db';
import { requireSession } from '../middlewares/requireSession.js';
import { requireRole } from '../middlewares/requireRole.js';
import { writeAuditLog } from './admin.js';

const router: Router = Router();

router.get('/tables', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allTables = await db.select().from(tables).where(eq(tables.active, true));
    const base = `${req.protocol}://${req.get('host')}`;
    res.json(allTables.map((t: any) => ({
      ...t,
      qrUrl: `${base}/?t=${t.qr_token}`,
    })));
  } catch (err) {
    next(err);
  }
});

router.get('/tables/:id/qr', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    const [table] = await db.select().from(tables).where(eq(tables.id, id)).limit(1);
    if (!table) { res.status(404).json({ error: 'Table not found' }); return; }

    const base = `${req.protocol}://${req.get('host')}`;
    const url = `${base}/?t=${table.qr_token}`;

    const png = await QRCode.toBuffer(url, { errorCorrectionLevel: 'M', width: 400, margin: 2 });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(png);
  } catch (err) {
    next(err);
  }
});

router.post('/tables', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableNumber, capacity } = req.body;
    
    if (!tableNumber) {
      res.status(400).json({ error: 'Table number is required' });
      return;
    }

    const [existing] = await db
      .select({ id: tables.id })
      .from(tables)
      .where(eq(tables.table_number, tableNumber))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: 'Table number already exists' });
      return;
    }

    const qrToken = uuidv4();
    const [table] = await db
      .insert(tables)
      .values({
        table_number: tableNumber,
        capacity: capacity ?? 4,
        qr_token: qrToken,
      })
      .returning();

    if (!table) throw new Error('Table insert returned no result');

    await writeAuditLog(req.staff?.staffId, 'table:created', 'table', String(table.id), {
      tableNumber: table.table_number,
      qrToken: table.qr_token,
    }, req);

    const base = `${req.protocol}://${req.get('host')}`;
    res.status(201).json({ ...table, qrUrl: `${base}/?t=${qrToken}` });
  } catch (err) {
    next(err);
  }
});

router.patch('/tables/:id', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    const [existing] = await db.select().from(tables).where(eq(tables.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Table not found' }); return; }

    const { tableNumber, capacity } = req.body;
    const updates: Partial<typeof tables.$inferInsert> = {};

    if (tableNumber !== undefined) {
      const [conflict] = await db
        .select({ id: tables.id })
        .from(tables)
        .where(eq(tables.table_number, tableNumber))
        .limit(1);
      if (conflict && conflict.id !== id) {
        res.status(409).json({ error: 'Table number already exists' });
        return;
      }
      updates.table_number = tableNumber;
    }
    if (capacity !== undefined) updates.capacity = capacity;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    await db.update(tables).set(updates).where(eq(tables.id, id));

    await writeAuditLog(req.staff?.staffId, 'table:updated', 'table', String(id), {
      changes: { tableNumber, capacity },
    }, req);

    res.json({ message: 'Table updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/tables/:id', requireSession, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    const [existing] = await db.select().from(tables).where(eq(tables.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Table not found' }); return; }

    await db.update(tables).set({ active: false }).where(eq(tables.id, id));

    await writeAuditLog(req.staff?.staffId, 'table:deactivated', 'table', String(id), {
      tableNumber: existing.table_number,
    }, req);

    res.json({ message: 'Table deactivated' });
  } catch (err) {
    next(err);
  }
});

export default router;
