import { pgTable, serial, integer, varchar, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const tableStatusEnum = pgEnum('table_status', ['available', 'occupied', 'reserved']);

export const tables = pgTable('tables', {
  id: serial('id').primaryKey(),
  table_number: integer('table_number').notNull().unique(),
  capacity: integer('capacity').default(4).notNull(),
  status: tableStatusEnum('status').default('available').notNull(),
  qr_token: varchar('qr_token', { length: 255 }).notNull().unique(),
  active: boolean('active').default(true).notNull(),
});

export const tablesRelations = relations(tables, ({ many }) => ({
  orders: many(orders),
}));

// Import for relations
import { orders } from './orders';

export type Table = typeof tables.$inferSelect;
export type NewTable = typeof tables.$inferInsert;
