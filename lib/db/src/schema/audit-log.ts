import { pgTable, serial, integer, varchar, text, timestamp, foreignKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { staff } from './staff';

export const audit_log = pgTable(
  'audit_log',
  {
    id: serial('id').primaryKey(),
    staff_id: integer('staff_id'),
    action: varchar('action', { length: 100 }).notNull(),
    entity_type: varchar('entity_type', { length: 50 }),
    entity_id: varchar('entity_id', { length: 100 }),
    details: text('details'),
    ip_address: varchar('ip_address', { length: 50 }),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  (table) => ({
    staffFk: foreignKey({
      columns: [table.staff_id],
      foreignColumns: [staff.id],
    }),
  }),
);

export const audit_logRelations = relations(audit_log, ({ one }) => ({
  staff: one(staff, {
    fields: [audit_log.staff_id],
    references: [staff.id],
  }),
}));

export type AuditLog = typeof audit_log.$inferSelect;
export type NewAuditLog = typeof audit_log.$inferInsert;
