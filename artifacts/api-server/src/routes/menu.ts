import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, menu_items } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { logger } from '../lib/logger.js';
import { requireSession } from '../middlewares/requireSession.js';
import { requireRole } from '../middlewares/requireRole.js';
import { asyncHandler, AppError } from '../middlewares/errorHandler.js';

const IMAGES_DIR = path.resolve(fileURLToPath(import.meta.url), '../../../../../Menu_Item_Images');

const upload = multer({
  storage: multer.diskStorage({
    destination: IMAGES_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `item_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
  },
});

const router: Router = Router();

const menuItemSchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  category: z.string().min(1, 'Category required'),
  available: z.boolean().optional().default(true),
  archived: z.boolean().optional().default(false),
  prep_time: z.number().int().optional().default(10),
  image_url: z.string().optional(),
  is_vegetarian: z.boolean().optional().default(false),
  spice_level: z.number().int().min(0).max(3).optional().default(0),
  allergens: z.array(z.string()).optional().default([]),
  popular: z.boolean().optional().default(false),
  stock_quantity: z.number().int().optional().default(-1),
});

// Update schema for PATCH — every field optional and WITHOUT defaults.
// (menuItemSchema.partial() would still re-apply .default() values for any field
// the caller omits, silently resetting available/archived/flags on every edit.)
const menuItemUpdateSchema = z.object({
  name: z.string().min(1, 'Name required').optional(),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive').optional(),
  category: z.string().min(1, 'Category required').optional(),
  available: z.boolean().optional(),
  archived: z.boolean().optional(),
  prep_time: z.number().int().optional(),
  image_url: z.string().optional(),
  is_vegetarian: z.boolean().optional(),
  spice_level: z.number().int().min(0).max(3).optional(),
  allergens: z.array(z.string()).optional(),
  popular: z.boolean().optional(),
  stock_quantity: z.number().int().optional(),
});

// POST /api/menu/upload — upload image file, return /images/... URL (admin only)
// Must be registered before /:id to avoid route collision
router.post(
  '/upload',
  requireSession,
  requireRole('admin'),
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('image')(req, res, (err) => {
      if (err instanceof multer.MulterError) { res.status(400).json({ error: err.message }); return; }
      if (err) { res.status(400).json({ error: (err as Error).message }); return; }
      next();
    });
  },
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new AppError(400, 'No image file provided');
    const imageUrl = `/images/${req.file.filename}`;
    logger.info(`Image uploaded: ${req.file.filename} by ${req.staff?.username}`);
    res.json({ imageUrl });
  })
);

// GET /api/menu — all non-archived items (public)
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const items = await db
      .select()
      .from(menu_items)
      .where(eq(menu_items.archived, false));
    res.json(items);
  })
);

// GET /api/menu/:id — single item (public)
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError(400, 'Invalid menu item id');

    const [item] = await db
      .select()
      .from(menu_items)
      .where(eq(menu_items.id, id))
      .limit(1);

    if (!item) throw new AppError(404, 'Menu item not found');
    res.json(item);
  })
);

// POST /api/menu — create item (admin only)
router.post(
  '/',
  requireSession,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const data = menuItemSchema.parse(req.body);

    const [result] = await db
      .insert(menu_items)
      .values({
        name: data.name,
        description: data.description,
        price: data.price.toString(),
        category: data.category,
        available: data.available,
        archived: data.archived,
        prep_time: data.prep_time,
        image_url: data.image_url,
        is_vegetarian: data.is_vegetarian,
        spice_level: data.spice_level,
        allergens: data.allergens,
        popular: data.popular,
        stock_quantity: data.stock_quantity,
      })
      .returning();

    logger.info(`Menu item created: ${data.name} by ${req.staff?.username}`);
    res.status(201).json(result);
  })
);

// PATCH /api/menu/:id — update item (admin only)
router.patch(
  '/:id',
  requireSession,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError(400, 'Invalid menu item id');

    const data = menuItemUpdateSchema.parse(req.body);
    const updates: Record<string, unknown> = { ...data, updated_at: new Date() };
    if (data.price !== undefined) updates.price = data.price.toString();

    const [result] = await db
      .update(menu_items)
      .set(updates)
      .where(eq(menu_items.id, id))
      .returning();

    if (!result) throw new AppError(404, 'Menu item not found');
    logger.info(`Menu item updated: ${req.params.id} by ${req.staff?.username}`);
    res.json(result);
  })
);

// DELETE /api/menu/:id — archive item (admin only)
router.delete(
  '/:id',
  requireSession,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError(400, 'Invalid menu item id');

    const [result] = await db
      .update(menu_items)
      .set({ archived: true, updated_at: new Date() })
      .where(eq(menu_items.id, id))
      .returning({ id: menu_items.id });

    if (!result) throw new AppError(404, 'Menu item not found');
    logger.info(`Menu item archived: ${req.params.id} by ${req.staff?.username}`);
    res.json({ message: 'Menu item archived' });
  })
);

export default router;
