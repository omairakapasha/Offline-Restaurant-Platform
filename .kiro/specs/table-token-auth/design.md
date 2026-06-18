# Design Document — table-token-auth

## Overview

This feature hardens `POST /api/orders` against table-number spoofing by enforcing an authentication gate inside the handler itself. The rule is simple: unauthenticated (customer) requests **must** supply a `tableToken`; authenticated staff requests may use a bare `tableNumber`. No new files, DB migrations, or frontend changes are required — all changes are confined to `artifacts/api-server/src/routes/orders.ts`.

### Key Design Decision: Optional Session via `trySession`, Not `requireSession`

`requireSession` hard-rejects any request without a valid session cookie (returns 401 immediately, never calls `next()`). We cannot put it on the `POST /` route because customer orders are legitimately unauthenticated.

Instead, a lightweight `trySession` helper runs the same lookup logic but **always** calls `next()` regardless of outcome, populating `req.staff` when a valid session exists and leaving it `undefined` when it does not. This keeps the session check non-blocking and lets the handler branch on `req.staff`.

---

## Architecture

The change touches exactly two things inside `orders.ts`:

1. **`createOrderSchema`** — the `.refine()` is unchanged (at least one of `tableToken`/`tableNumber` must be present); no schema shape changes are needed because the auth rule is enforced at runtime inside the handler, not at the schema layer.

2. **`POST /` handler** — a `trySession` call is inserted as a middleware before the handler. Inside the handler, after schema parsing, a single auth-gate branch decides what is allowed.

```
Request
  │
  ▼
orderLimiter          (existing — unchanged)
  │
  ▼
trySession            (NEW — populates req.staff if cookie present, always calls next())
  │
  ▼
asyncHandler(POST /)
  │
  ├─ parse body with createOrderSchema (unchanged)
  │
  ├─ AUTH GATE ────────────────────────────────────────────────────
  │   isStaff = req.staff !== undefined
  │   hasToken = data.tableToken !== undefined
  │
  │   if (!isStaff && !hasToken):
  │     logger.warn(...)
  │     return 401 "Table token required"
  │
  │   if (isStaff && !hasToken && !data.tableNumber):
  │     → schema already rejects this (refine), unreachable
  │
  ├─ TABLE LOOKUP ─────────────────────────────────────────────────
  │   token present (any caller)  → lookup by qr_token (same as today)
  │   staff only, no token        → lookup by table_number
  │
  │   table not found AND isStaff  → 400 "Invalid table"
  │   table not found AND !isStaff → 401 "Invalid table"  ← new
  │
  └─ ... rest of handler unchanged ...
```

---

## Components and Interfaces

### `trySession` helper (new, local to `routes/orders.ts`)

```typescript
async function trySession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.session as string | undefined;
  if (!token) { next(); return; }

  try {
    const result = await db
      .select({ ... })   // same query as requireSession
      .from(sessions)
      .innerJoin(staff, eq(sessions.staff_id, staff.id))
      .where(and(eq(sessions.token, token), gt(sessions.expires_at, new Date())))
      .limit(1);

    const row = result[0];
    if (row?.active) {
      req.staff = { staffId: row.staffId, username: row.username,
                    fullName: row.fullName, role: row.role, sessionId: row.sessionId };
    }
  } catch (_) {
    // swallow DB errors — failing to load session is treated as unauthenticated
  }
  next();
}
```

> **Rationale**: keeping this inline avoids coupling to `requireSession`'s hard-reject behaviour. A DB error during optional session loading must not block a legitimate customer order.

### Modified `POST /` route registration

```typescript
router.post('/', orderLimiter, trySession, asyncHandler(async (req, res) => { ... }));
```

### Auth Gate Logic (inside handler, after schema parse)

```typescript
const isStaff = req.staff !== undefined;
const hasToken = typeof data.tableToken === 'string';

if (!isStaff && !hasToken) {
  logger.warn({
    msg: 'Unauthenticated order rejected: tableToken missing',
    tableNumber: data.tableNumber ?? null,
    ip: getClientIp(req),
  });
  return res.status(401).json({ error: 'Table token required' });
}
```

### Table Lookup Logic (replaces current one-liner)

```typescript
let tableWhere;
if (hasToken) {
  // token always wins — staff or customer
  tableWhere = and(eq(tables.qr_token, data.tableToken!), eq(tables.active, true));
} else {
  // staff only — number-based lookup (hasToken=false, so schema guarantees tableNumber is present)
  tableWhere = and(eq(tables.table_number, data.tableNumber!), eq(tables.active, true));
}

const [tableRecord] = await db.select().from(tables).where(tableWhere).limit(1);

if (!tableRecord) {
  // 401 for unauthenticated (invalid token), 400 for staff (invalid table number)
  throw new AppError(hasToken && !isStaff ? 401 : 400, 'Invalid table');
}
```

> **Note on the not-found status code**: when `hasToken=true && !isStaff` (customer supplies a token that matches nothing) the requirement says 401. When `isStaff` and a number doesn't match, the requirement says 400. When `isStaff && hasToken` and the token doesn't match, that is logically a bad token — throwing 400 is reasonable (staff should not submit invalid tokens).

---

## Data Models

No schema changes. Relevant existing columns:

| Table    | Column         | Type           | Constraint          |
|----------|----------------|----------------|---------------------|
| `tables` | `qr_token`     | `varchar(255)` | `NOT NULL UNIQUE`   |
| `tables` | `table_number` | `integer`      | `NOT NULL UNIQUE`   |
| `tables` | `active`       | `boolean`      | `NOT NULL DEFAULT true` |

`req.staff` type (`StaffSession`) is already declared globally by `requireSession.ts` and is unchanged.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Unauthenticated requests without a tableToken are always rejected

*For any* valid order request body that omits `tableToken` (whether or not `tableNumber` is present), if there is no authenticated staff session, the Order_API SHALL return HTTP 401.

**Validates: Requirements 1.1, 1.4**

---

### Property 2: Invalid tableToken always yields HTTP 401 for unauthenticated callers

*For any* unauthenticated request that supplies a `tableToken` string that does not match any active table's `qr_token`, the Order_API SHALL return HTTP 401 with the error message `"Invalid table"`.

**Validates: Requirements 1.2**

---

### Property 3: Staff requests with an invalid tableNumber yield HTTP 400

*For any* authenticated staff request that supplies a `tableNumber` (with no `tableToken`) that does not match any active table's `table_number`, the Order_API SHALL return HTTP 400 with the error message `"Invalid table"`.

**Validates: Requirements 2.2**

---

### Property 4: tableToken takes precedence over tableNumber for all callers

*For any* request (staff or customer) that supplies both a valid `tableToken` and a `tableNumber`, the Order_API SHALL resolve the table using `tableToken` only — the `tableNumber` field is ignored.

**Validates: Requirements 2.3**

---

### Property 5: createOrderSchema correctly validates table identifier fields

*For any* request body:
- A `tableToken` that is an empty string SHALL be rejected by the schema.
- A `tableNumber` that is zero, negative, or non-integer SHALL be rejected by the schema.
- A body containing neither `tableToken` nor `tableNumber` SHALL be rejected by the schema.

**Validates: Requirements 3.1, 3.2, 3.3**

---

### Property 6: Rate-limiter key generation is consistent with token presence

*For any* request, the `orderLimiter` key generator SHALL return `"table:<tableToken>"` when a non-empty `tableToken` is present in the request body, and SHALL return the request's IP address otherwise.

**Validates: Requirements 5.1, 5.2**

---

### Property 7: Rejected unauthenticated requests produce a warn-level log entry

*For any* request rejected at the auth gate (unauthenticated + no `tableToken`), `logger.warn` SHALL be called exactly once with a payload containing both the `ip` field (the client IP) and the `tableNumber` field (the supplied value or `null`).

**Validates: Requirements 6.1**

---

### Property 8: Error responses to unauthenticated clients contain no internal details

*For any* HTTP 401 response returned by the Order_API, the JSON body SHALL contain only an `error` string field and SHALL NOT contain any database identifiers, stack traces, or other internal implementation details.

**Validates: Requirements 6.2**

---

## Error Handling

| Scenario | HTTP Status | Response body | Logged? |
|---|---|---|---|
| Unauthenticated, no `tableToken` (any body) | 401 | `{ error: "Table token required" }` | `warn` with `tableNumber`, `ip` |
| Unauthenticated, `tableToken` present but no matching active table | 401 | `{ error: "Invalid table" }` | No (AppError path) |
| Staff, `tableNumber` present but no matching active table | 400 | `{ error: "Invalid table" }` | No |
| Schema parse failure (missing both fields, bad types, etc.) | 422 | Zod error details via `errorHandler` | No |
| Rate limit exceeded | 429 | `{ error: "Too many orders placed. Please wait a minute." }` | No |

> **Security note**: All 401 responses visible to unauthenticated callers are intentionally generic. The warn-level log captures the detail for operators without surfacing it externally.

---

## Testing Strategy

### Unit / Property-Based Tests

The test file lives at `artifacts/api-server/src/routes/__tests__/orders.auth.test.ts`.

**PBT library**: [`fast-check`](https://fast-check.dev/) — zero extra runtime dependencies for the test layer; works with Node ESM out of the box.

Each property test runs **≥ 100 iterations** and is tagged with a comment referencing its design property.

```
Feature: table-token-auth, Property N: <property_text>
```

**Properties to implement as PBT**:

| Property | What fast-check generates | Assertion |
|---|---|---|
| P1 — No-token unauthenticated → 401 | Valid order body, tableToken omitted, req.staff=undefined | status === 401 |
| P2 — Invalid token → 401 | Random UUID strings (not seeded qr_token), no session | status === 401, body.error === "Invalid table" |
| P3 — Staff, invalid number → 400 | Random integers not matching any table, req.staff set | status === 400, body.error === "Invalid table" |
| P4 — Token beats number | Valid token + any integer tableNumber, req.staff set or not | resolved table_id === token's table_id |
| P5 — Schema validation | Empty strings, floats, negatives, missing both fields | `createOrderSchema.safeParse` returns `success: false` |
| P6 — Rate-limiter key | Arbitrary token strings / absent token | keyGenerator result matches expected pattern |
| P7 — Warn log on rejection | Valid order body without token, no session | logger.warn spy called once with {ip, tableNumber} |
| P8 — No internal details in 401 | Any rejection scenario | Response body keys === ["error"] |

**Example-based integration tests**:

- Happy path: valid `tableToken`, no session → 201 (Requirements 1.3, 4.1–4.3)
- Happy path: valid `tableNumber`, staff session → 201 (Requirements 2.1, 2.4)
- Schema failure → 422/400 (Requirement 3.4)
- Rate-limit window → 429 on 11th request (Requirement 5.3)

### Test Isolation

- The DB layer is mocked via `vi.mock('@workspace/db')` — no real Postgres required for unit tests.
- `req.staff` is set directly on the mock request object to simulate authenticated/unauthenticated states.
- `logger.warn` is spied on with `vi.spyOn`.

### Regression Tests

The existing customer QR-code flow is covered by the happy-path integration test above. Run the full suite before shipping to confirm no regressions on the cancel, status-update, and queue endpoints.
