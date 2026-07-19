/**
 * Test suite for the table-token-auth security fix (PLAN.md #0).
 *
 * Exercises the auth/authz logic on POST /api/orders:
 *   - Unauthenticated callers MUST supply a valid QR `tableToken`.
 *   - A typed `tableNumber` alone (the old spoofing vector) is rejected.
 *   - Authenticated staff MAY use `tableNumber`.
 *   - When both are present, the `tableToken` (QR) lookup always wins.
 *
 * The route is mounted on a real Express app and driven via supertest. The DB is
 * replaced with a queue-based chainable mock: each awaited query shifts the next
 * result off `resultQueue`, and every `where(...)` argument is recorded in
 * `whereCalls` so we can assert which column a lookup keyed on.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

// --- Shared mock state (module-level so every chain shares the same queues) ---
const resultQueue: any[] = [];
const whereCalls: any[] = [];

/**
 * Builds a chainable, awaitable proxy standing in for a Drizzle query builder.
 * - Any method (select/from/innerJoin/values/set/...) returns a fresh chain.
 * - `where(arg)` additionally records `arg` for later assertions.
 * - Awaiting a chain (`then`) shifts the next result off `resultQueue` (or []).
 * - `transaction(cb)` invokes the callback with a chain and returns its result.
 */
function makeChain(): any {
  return new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: any) => void) => {
          resolve(resultQueue.length ? resultQueue.shift() : []);
        };
      }
      if (prop === 'transaction') {
        return async (cb: (tx: any) => any) => cb(makeChain());
      }
      if (prop === 'where') {
        return (arg: any) => {
          whereCalls.push(arg);
          return makeChain();
        };
      }
      return (..._args: any[]) => makeChain();
    },
  });
}

// Replace Drizzle operators with plain, inspectable descriptors so we can assert
// on the column/value a where-clause was built from.
vi.mock('drizzle-orm', () => ({
  eq: (col: any, val: any) => ({ op: 'eq', col, val }),
  ne: (col: any, val: any) => ({ op: 'ne', col, val }),
  and: (...args: any[]) => ({ op: 'and', args }),
  gt: (col: any, val: any) => ({ op: 'gt', col, val }),
  gte: (col: any, val: any) => ({ op: 'gte', col, val }),
  inArray: (col: any, vals: any) => ({ op: 'inArray', col, vals }),
  desc: (col: any) => ({ op: 'desc', col }),
  sql: (..._args: any[]) => ({ op: 'sql' }),
}));

// Mock the database module before importing the route. Table objects expose
// string-valued columns so `eq(tables.qr_token, x)` records col: 'tables.qr_token'.
vi.mock('@workspace/db', () => {
  const db = makeChain();
  return {
    db,
    orders: {
      id: 'orders.id',
      table_id: 'orders.table_id',
      total_amount: 'orders.total_amount',
      status: 'orders.status',
      customer_name: 'orders.customer_name',
      customer_phone: 'orders.customer_phone',
      special_instructions: 'orders.special_instructions',
      created_at: 'orders.created_at',
      updated_at: 'orders.updated_at',
    },
    order_items: {
      order_id: 'order_items.order_id',
      menu_item_id: 'order_items.menu_item_id',
      quantity: 'order_items.quantity',
      price: 'order_items.price',
      special_instructions: 'order_items.special_instructions',
    },
    tables: {
      id: 'tables.id',
      table_number: 'tables.table_number',
      qr_token: 'tables.qr_token',
      active: 'tables.active',
      status: 'tables.status',
    },
    menu_items: {
      id: 'menu_items.id',
      name: 'menu_items.name',
      price: 'menu_items.price',
      available: 'menu_items.available',
      stock_quantity: 'menu_items.stock_quantity',
      prep_time: 'menu_items.prep_time',
    },
    sessions: {
      id: 'sessions.id',
      token: 'sessions.token',
      staff_id: 'sessions.staff_id',
      expires_at: 'sessions.expires_at',
    },
    staff: {
      id: 'staff.id',
      username: 'staff.username',
      full_name: 'staff.full_name',
      role: 'staff.role',
      active: 'staff.active',
    },
    order_status_history: {},
  };
});

// Side-effecting collaborators — stubbed so the handler stays in-process.
vi.mock('../../lib/websocket', () => ({ broadcast: vi.fn(), setWsManager: vi.fn() }));
vi.mock('../../lib/push.js', () => ({ sendOrderReadyNotification: vi.fn(() => Promise.resolve()) }));
vi.mock('../../lib/auditLog.js', () => ({ writeAuditLog: vi.fn(() => Promise.resolve()) }));

// Route + error handler are imported after the mocks are registered.
import ordersRouter from '../orders';
import { errorHandler } from '../../middlewares/errorHandler';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/orders', ordersRouter);
  app.use(errorHandler as any);
  return app;
}

/** A table row returned by the table lookup. */
const TABLE_ROW = { id: 1, table_number: 5, qr_token: 'valid-token', active: true };
/** A single unlimited-stock menu item (stock -1 skips the stock-decrement path). */
const MENU_ROW = {
  id: 1, name: 'Burger', price: 10, available: true, stock_quantity: -1, prep_time: 12,
};
/** A live staff session row for the trySession lookup. */
const STAFF_SESSION_ROW = {
  sessionId: 1, staffId: 2, username: 'waiter1', fullName: 'Waiter One', role: 'waiter', active: true,
};

/** Queues the DB results for a successful order creation (after any preamble). */
function queueHappyPathTail() {
  resultQueue.push([TABLE_ROW]); // table lookup
  resultQueue.push([MENU_ROW]);  // menu_items fetch
  resultQueue.push({}, {}, {});  // insert orders, insert order_items, update tables
}

/**
 * Builds a minimal valid order body. Defaults satisfy the Zod schema's
 * refine() by including a tableNumber; callers override as needed.
 */
export function buildValidOrderBody(overrides: Record<string, any> = {}) {
  return {
    customerName: 'John Doe',
    customerPhone: '+1234567890',
    items: [{ menuItemId: 1, quantity: 2 }],
    tableNumber: 5,
    ...overrides,
  };
}

describe('POST /api/orders — table-token auth', () => {
  let app: express.Express;

  beforeEach(() => {
    resultQueue.length = 0;
    whereCalls.length = 0;
    vi.clearAllMocks();
    app = makeApp();
  });

  it('rejects an unauthenticated order that supplies only a tableNumber (spoofing vector)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send(buildValidOrderBody({ tableNumber: 7 })); // no token, no session cookie

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Table token required');
  });

  it('rejects an unauthenticated order with an invalid tableToken', async () => {
    resultQueue.push([]); // table lookup finds nothing

    const res = await request(app)
      .post('/api/orders')
      .send(buildValidOrderBody({ tableToken: 'bogus', tableNumber: undefined }));

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid table');
  });

  it('accepts an unauthenticated order with a valid tableToken', async () => {
    queueHappyPathTail();

    const res = await request(app)
      .post('/api/orders')
      .send(buildValidOrderBody({ tableToken: 'valid-token', tableNumber: undefined }));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'received' });
    // Lookup keyed on the QR token, not the table number.
    const lookupClause = JSON.stringify(whereCalls[0]);
    expect(lookupClause).toContain('tables.qr_token');
    expect(lookupClause).not.toContain('tables.table_number');
  });

  it('accepts a staff (session) order that uses a tableNumber', async () => {
    resultQueue.push([STAFF_SESSION_ROW]); // trySession lookup
    queueHappyPathTail();

    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', ['session=staff-session-token'])
      .send(buildValidOrderBody({ tableNumber: 5, tableToken: undefined }));

    expect(res.status).toBe(201);
    // whereCalls[0] = session lookup, whereCalls[1] = table lookup by number.
    expect(JSON.stringify(whereCalls[1])).toContain('tables.table_number');
  });

  it('prefers the tableToken over tableNumber when both are supplied', async () => {
    queueHappyPathTail();

    const res = await request(app)
      .post('/api/orders')
      // Valid token + bogus number: token must win, so this succeeds.
      .send(buildValidOrderBody({ tableToken: 'valid-token', tableNumber: 999 }));

    expect(res.status).toBe(201);
    const lookupClause = JSON.stringify(whereCalls[0]);
    expect(lookupClause).toContain('tables.qr_token');
    expect(lookupClause).toContain('valid-token');
    expect(lookupClause).not.toContain('tables.table_number');
  });
});

describe('buildValidOrderBody helper', () => {
  it('produces a schema-valid body and merges overrides', () => {
    const body = buildValidOrderBody({ customerName: 'Jane', tableToken: 't-1' });
    expect(body.customerName).toBe('Jane');
    expect((body as any).tableToken).toBe('t-1');
    expect(body.items[0]).toMatchObject({ menuItemId: 1, quantity: 2 });
  });
});
