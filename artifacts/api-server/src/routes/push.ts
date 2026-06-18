import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middlewares/errorHandler.js';
import { storePushSubscription } from '../lib/push.js';

const router: Router = Router();

router.post(
  '/subscribe',
  asyncHandler(async (req: Request, res: Response) => {
    const { orderId, subscription } = req.body;
    if (!orderId || typeof orderId !== 'string') throw new AppError(400, 'orderId is required');
    if (!subscription?.endpoint) throw new AppError(400, 'Valid push subscription is required');
    await storePushSubscription(orderId, subscription);
    res.json({ ok: true });
  })
);

export default router;
