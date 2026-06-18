import { pgTable, serial, varchar, integer, timestamp, foreignKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { staff } from './staff';

export const sessions = pgTable(
  'sessions',
  {
    id: serial('id').primaryKey(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    staff_id: integer('staff_id').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    expires_at: timestamp('expires_at').notNull(),
    ip_address: varchar('ip_address', { length: 50 }),
    user_agent: varchar('user_agent', { length: 255 }),
  },
  (table) => ({
    staffFk: foreignKey({
      columns: [table.staff_id],
      foreignColumns: [staff.id],
    }),
  }),
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  staff: one(staff, {
    fields: [sessions.staff_id],
    references: [staff.id],
  }),
}));

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
