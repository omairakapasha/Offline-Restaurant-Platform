# Implementation Plan: table-token-auth

## Overview

All changes are confined to `artifacts/api-server/src/routes/orders.ts` plus a new test file. The work consists of three sequential steps: (1) add the `trySession` helper and wire it into the `POST /` route, (2) insert the auth-gate and updated table-lookup branches inside the handler, (3) install the test toolchain and write property-based + integration tests that exercise all eight correctness properties.

No DB migrations, no new routes, and no frontend changes are required.

## Tasks

- [x] 1. Install test toolchain
  - Add `vitest`, `@vitest/coverage-v8`, `fast-check`, and `supertest` / `@types/supertest` as `devDependencies` in `artifacts/api-server/package.json`
  - Add a `"test": "vitest --run"` script to the same `package.json`
  - Add a minimal `vitest.config.ts` in `artifacts/api-server/` that sets `environment: "node"` and enables ESM transforms for the `@workspace/db` alias
  - _Requirements: 3.1, 3.2, 3.3, 3.4 — provides the test harness needed to verify all acceptance criteria_

- [x] 2. Implement `trySession` helper and register it on the route
  - [x] 2.1 Add the `trySession` async middleware function inside `artifacts/api-server/src/routes/orders.ts`
    - Import `NextFunction` from `express` (add to existing import if not present)
    - Import `sessions` and `staff` from `@workspace/db` (add to existing DB import)
    - Import `gt` from `drizzle-orm` (add to existing import if not present)
    - Implement `trySession`: read `req.cookies?.session`, run the same DB query as `requireSession` (join `sessions → staff`, filter by token + expiry), set `req.staff` on success, swallow DB errors, and **always** call `next()`
    - _Requirements: 2.1, 2.4, 4.1, 4.3_
  - [x] 2.2 Register `trySession` as middleware between `orderLimiter` and `asyncHandler` on the `POST /` route
    - Change `router.post('/', orderLimiter, asyncHandler(...))` to `router.post('/', orderLimiter, trySession, asyncHandler(...))`
    - _Requirements: 2.1, 4.3_

- [x] 3. Insert auth gate inside the `POST /` handler
  - [x] 3.1 Add the `isStaff` / `hasToken` auth-gate block after `createOrderSchema.parse(req.body)`
    - Derive `const isStaff = req.staff !== undefined` and `const hasToken = typeof data.tableToken === 'string'`
    - When `!isStaff && !hasToken`: call `logger.warn({ msg: 'Unauthenticated order rejected: tableToken missing', tableNumber: data.tableNumber ?? null, ip: req.ip ?? req.socket.remoteAddress ?? 'unknown' })` then return `res.status(401).json({ error: 'Table token required' })`
    - _Requirements: 1.1, 1.4, 6.1, 6.2_
  - [x] 3.2 Replace the existing single-expression `tableWhere` assignment with the branched lookup
    - When `hasToken`: look up by `qr_token` (current behaviour)
    - When `!hasToken` (staff-only path): look up by `table_number`
    - Replace `throw new AppError(401, 'Invalid table')` with: `throw new AppError(hasToken && !isStaff ? 401 : 400, 'Invalid table')`
    - _Requirements: 1.2, 2.2, 2.3_

- [x] 4. Checkpoint — verify the handler changes compile and do not break existing routes
  - Run `pnpm --filter @workspace/api-server typecheck` and confirm zero type errors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Write property-based and integration tests
  - [x] 5.1 Create `artifacts/api-server/src/routes/__tests__/orders.auth.test.ts` with test scaffolding
    - Set up `vi.mock('@workspace/db')` to replace all DB calls with controllable stubs
    - Spy on `logger.warn` with `vi.spyOn`
    - Create a helper that builds a minimal valid order request body (with all required fields: `customerName`, `customerPhone`, `items` with one valid menu item)
    - _Requirements: all — scaffolding needed by every subsequent test sub-task_
  - [ ]* 5.2 Write property test for Property 1 — unauthenticated + no token → 401
    - **Property 1: Unauthenticated requests without a tableToken are always rejected**
    - **Validates: Requirements 1.1, 1.4**
    - Use `fc.record({ tableNumber: fc.integer({ min: 1 }) })` combined with valid body fields; omit `tableToken`; assert HTTP 401
  - [ ]* 5.3 Write property test for Property 2 — invalid token → 401 for unauthenticated callers
    - **Property 2: Invalid tableToken always yields HTTP 401 for unauthenticated callers**
    - **Validates: Requirements 1.2**
    - Generate arbitrary UUID-like strings that are not seeded in the mocked DB; assert HTTP 401 and `body.error === "Invalid table"`
  - [ ]* 5.4 Write property test for Property 3 — staff + invalid tableNumber → 400
    - **Property 3: Staff requests with an invalid tableNumber yield HTTP 400**
    - **Validates: Requirements 2.2**
    - Set `req.staff` in the mock; generate random positive integers not matching any table; assert HTTP 400 and `body.error === "Invalid table"`
  - [ ]* 5.5 Write property test for Property 4 — tableToken beats tableNumber for all callers
    - **Property 4: tableToken takes precedence over tableNumber for all callers**
    - **Validates: Requirements 2.3**
    - Supply both a valid seeded `tableToken` and an arbitrary `tableNumber`; assert the resolved `table_id` matches the token's table, not the number
  - [ ]* 5.6 Write property test for Property 5 — schema validation
    - **Property 5: createOrderSchema correctly validates table identifier fields**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Use `fc.oneof` to generate empty-string tokens, zero/negative/float table numbers, and bodies missing both fields; call `createOrderSchema.safeParse`; assert `success === false`
  - [ ]* 5.7 Write property test for Property 6 — rate-limiter key consistency
    - **Property 6: Rate-limiter key generation is consistent with token presence**
    - **Validates: Requirements 5.1, 5.2**
    - Extract `keyGenerator` from `orderLimiter` and invoke it directly; generate arbitrary non-empty token strings and absent-token cases; assert the returned key prefix matches `"table:<token>"` or falls back to the IP
  - [ ]* 5.8 Write property test for Property 7 — warn log on auth-gate rejection
    - **Property 7: Rejected unauthenticated requests produce a warn-level log entry**
    - **Validates: Requirements 6.1**
    - For any valid body without `tableToken` and no session: assert `logger.warn` spy was called exactly once and the call payload contains `ip` and `tableNumber` fields
  - [ ]* 5.9 Write property test for Property 8 — no internal details in 401 responses
    - **Property 8: Error responses to unauthenticated clients contain no internal details**
    - **Validates: Requirements 6.2**
    - For every scenario that produces a 401: assert `Object.keys(body)` deep-equals `["error"]`
  - [ ]* 5.10 Write example-based integration tests for happy paths and edge cases
    - Happy path: valid `tableToken`, no session cookie → HTTP 201 (Requirements 1.3, 4.1–4.3)
    - Happy path: valid `tableNumber`, active staff session → HTTP 201 (Requirements 2.1, 2.4)
    - Schema failure (missing both fields) → HTTP 400/422 (Requirement 3.4)
    - Rate-limit window: 11th request in 60 s → HTTP 429 (Requirement 5.3)

- [ ] 6. Final checkpoint — Ensure all tests pass
  - Run `pnpm --filter @workspace/api-server test` and confirm all tests green
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- `trySession` must **always** call `next()` — a DB failure during optional session loading must not block a legitimate customer order
- The auth-gate return path uses a plain `res.status(401).json(...)` (not `AppError`) so that the warn log fires before the error handler
- The table-lookup status-code change (`401` for unauthenticated bad token, `400` for staff bad number) is a single ternary replacing the current `throw new AppError(401, ...)` line
- `createOrderSchema` and `orderLimiter.keyGenerator` are verified-but-not-changed; property tests P5 and P6 confirm the existing code already satisfies the requirements

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9", "5.10"] }
  ]
}
```
