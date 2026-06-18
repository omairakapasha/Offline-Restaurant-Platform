import { pgTable, serial, uuid, integer, numeric, text, foreignKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orders } from './orders';
import { menu_items } from './menu-items';

export const order_items = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    order_id: uuid('order_id').notNull(),
    menu_item_id: integer('menu_item_id').notNull(),
    quantity: integer('quantity').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    special_instructions: text('special_instructions'),
  },
  (table) => ({
    orderFk: foreignKey({
      columns: [table.order_id],
      foreignColumns: [orders.id],
    }),
    menuItemFk: foreignKey({
      columns: [table.menu_item_id],
      foreignColumns: [menu_items.id],
    }),
  }),
);

export const order_itemsRelations = relations(order_items, ({ one }) => ({
  order: one(orders, {
    fields: [order_items.order_id],
    references: [orders.id],
  }),
  menu_item: one(menu_items, {
    fields: [order_items.menu_item_id],
    references: [menu_items.id],
  }),
}));

export type OrderItem = typeof order_items.$inferSelect;
export type NewOrderItem = typeof order_items.$inferInsert;
