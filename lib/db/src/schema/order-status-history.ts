import { pgTable, serial, uuid, varchar, integer, text, timestamp, foreignKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orders } from './orders';
import { staff } from './staff';

export const order_status_history = pgTable(
  'order_status_history',
  {
    id: serial('id').primaryKey(),
    order_id: uuid('order_id').notNull(),
    from_status: varchar('from_status', { length: 20 }),
    to_status: varchar('to_status', { length: 20 }).notNull(),
    changed_by: integer('changed_by'),
    changed_at: timestamp('changed_at').defaultNow().notNull(),
    notes: text('notes'),
  },
  (table) => ({
    orderFk: foreignKey({
      columns: [table.order_id],
      foreignColumns: [orders.id],
    }),
    staffFk: foreignKey({
      columns: [table.changed_by],
      foreignColumns: [staff.id],
    }),
  }),
);

export const order_status_historyRelations = relations(order_status_history, ({ one }) => ({
  order: one(orders, {
    fields: [order_status_history.order_id],
    references: [orders.id],
  }),
  staff: one(staff, {
    fields: [order_status_history.changed_by],
    references: [staff.id],
  }),
}));

export type OrderStatusHistory = typeof order_status_history.$inferSelect;
export type NewOrderStatusHistory = typeof order_status_history.$inferInsert;
