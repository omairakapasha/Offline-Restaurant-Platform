import { pgTable, uuid, integer, numeric, text, varchar, timestamp, pgEnum, foreignKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tables } from './tables';
import { staff } from './staff';

export const orderStatusEnum = pgEnum('order_status', ['received', 'preparing', 'ready', 'served', 'cancelled']);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    table_id: integer('table_id').notNull(),
    staff_id: integer('staff_id'),
    total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
    status: orderStatusEnum('status').default('received').notNull(),
    customer_name: varchar('customer_name', { length: 100 }),
    customer_phone: varchar('customer_phone', { length: 20 }),
    special_instructions: text('special_instructions'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    estimated_ready_time: timestamp('estimated_ready_time'),
    completed_at: timestamp('completed_at'),
    cancelled_at: timestamp('cancelled_at'),
    cancellation_reason: text('cancellation_reason'),
  },
  (table) => ({
    tableFk: foreignKey({
      columns: [table.table_id],
      foreignColumns: [tables.id],
    }),
    staffFk: foreignKey({
      columns: [table.staff_id],
      foreignColumns: [staff.id],
    }),
  }),
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  table: one(tables, {
    fields: [orders.table_id],
    references: [tables.id],
  }),
  staff: one(staff, {
    fields: [orders.staff_id],
    references: [staff.id],
  }),
  items: many(order_items),
  status_history: many(order_status_history),
}));

// Import for relations
import { order_items } from './order-items';
import { order_status_history } from './order-status-history';

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
