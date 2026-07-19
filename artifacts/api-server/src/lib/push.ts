import webpush from 'web-push';
import type { PushSubscription as WebPushSub } from 'web-push';
import { eq } from 'drizzle-orm';
import { db, push_subscriptions } from '@workspace/db';
import { logger } from './logger.js';

export async function storePushSubscription(orderId: string, sub: WebPushSub): Promise<void> {
  await db
    .insert(push_subscriptions)
    .values({
      order_id: orderId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    })
    .onConflictDoUpdate({
      target: push_subscriptions.order_id,
      set: {
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    });
}

export async function sendOrderReadyNotification(orderId: string, tableNumber: number): Promise<void> {
  const [row] = await db
    .select()
    .from(push_subscriptions)
    .where(eq(push_subscriptions.order_id, orderId))
    .limit(1);

  if (!row) return;

  // Delete first — one-shot to prevent double-notify
  await db.delete(push_subscriptions).where(eq(push_subscriptions.order_id, orderId));

  try {
    await webpush.sendNotification(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      JSON.stringify({
        title: '🍽️ Order Ready!',
        body: `Table ${tableNumber} — your food is ready. Enjoy!`,
      })
    );
  } catch (err) {
    logger.warn('Push notification delivery failed', { orderId, err });
  }
}
