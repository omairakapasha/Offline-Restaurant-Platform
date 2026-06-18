import { pgTable, serial, varchar, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const staffRoleEnum = pgEnum('staff_role', ['admin', 'kitchen', 'waiter']);

export const staff = pgTable('staff', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  full_name: varchar('full_name', { length: 100 }).notNull(),
  role: staffRoleEnum('role').notNull(),
  active: boolean('active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  last_login: timestamp('last_login'),
});

export const staffRelations = relations(staff, ({ many }) => ({
  sessions: many(sessions),
  audit_logs: many(audit_log),
}));

// Import other tables for relations
import { sessions } from './sessions';
import { audit_log } from './audit-log';

export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
