import { pgTable, serial, varchar, text, numeric, boolean, integer, timestamp, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const menu_items = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  available: boolean('available').default(true).notNull(),
  archived: boolean('archived').default(false).notNull(),
  prep_time: integer('prep_time').default(10).notNull(),
  image_url: varchar('image_url', { length: 255 }),
  is_vegetarian: boolean('is_vegetarian').default(false).notNull(),
  spice_level: integer('spice_level').default(0).notNull(),
  allergens: json('allergens').$type<string[]>().default([]).notNull(),
  popular: boolean('popular').default(false).notNull(),
  stock_quantity: integer('stock_quantity').default(-1).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const menu_itemsRelations = relations(menu_items, ({ many }) => ({
  order_items: many(order_items),
}));

// Import for relations
import { order_items } from './order-items';

export type MenuItem = typeof menu_items.$inferSelect;
export type NewMenuItem = typeof menu_items.$inferInsert;
