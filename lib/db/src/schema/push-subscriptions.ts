import { pgTable, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const push_subscriptions = pgTable('push_subscriptions', {
  order_id: varchar('order_id', { length: 36 }).primaryKey(),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type PushSubscriptionRow = typeof push_subscriptions.$inferSelect;
export type NewPushSubscriptionRow = typeof push_subscriptions.$inferInsert;
