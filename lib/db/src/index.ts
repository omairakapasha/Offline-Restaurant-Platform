import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Import all schemas
import * as staffSchema from './schema/staff.js';
import * as sessionsSchema from './schema/sessions.js';
import * as menuItemsSchema from './schema/menu-items.js';
import * as tablesSchema from './schema/tables.js';
import * as ordersSchema from './schema/orders.js';
import * as orderItemsSchema from './schema/order-items.js';
import * as orderStatusHistorySchema from './schema/order-status-history.js';
import * as auditLogSchema from './schema/audit-log.js';
import * as pushSubscriptionsSchema from './schema/push-subscriptions.js';

// Export schemas
export * from './schema/staff.js';
export * from './schema/sessions.js';
export * from './schema/menu-items.js';
export * from './schema/tables.js';
export * from './schema/orders.js';
export * from './schema/order-items.js';
export * from './schema/order-status-history.js';
export * from './schema/audit-log.js';
export * from './schema/push-subscriptions.js';

// Create database connection
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[db] Idle client error — DB connection lost:', err.message);
});

export const db = drizzle(pool, {
  schema: {
    ...staffSchema,
    ...sessionsSchema,
    ...menuItemsSchema,
    ...tablesSchema,
    ...ordersSchema,
    ...orderItemsSchema,
    ...orderStatusHistorySchema,
    ...auditLogSchema,
    ...pushSubscriptionsSchema,
  },
});

export type Database = typeof db;
