# Requirements Document

## Introduction

This feature hardens the order-placement endpoint (`POST /api/orders`) against table-number spoofing. Currently the endpoint accepts either a `tableToken` (the QR-code UUID from the table's `qr_token` column) or a raw `tableNumber` integer, with no session required for either path. A diner can therefore type any table number and place an order against a table they are not sitting at.

The fix enforces the following rule: unauthenticated (customer) requests **must** supply a valid `tableToken`; only authenticated staff (waiter or above) may use a bare `tableNumber`. The customer page already extracts the token from the `?t=` query parameter, so the happy path is unaffected. Waiters placing orders from the waiter panel continue to work because they carry an active session cookie.

## Glossary

- **Order_API**: The `POST /api/orders` Express route handler in `artifacts/api-server/src/routes/orders.ts`.
- **Table_Token**: The UUID value stored in `tables.qr_token`; embedded in QR codes as the `?t=` query parameter.
- **Table_Number**: The human-readable integer stored in `tables.table_number`.
- **Customer**: An unauthenticated diner accessing the ordering page via a scanned QR code.
- **Staff**: An authenticated user with a valid session cookie and a role of `waiter`, `kitchen`, or `admin` (role level ≥ 1).
- **Waiter**: A Staff member with role `waiter` (level 1) or higher.
- **Session**: An active, non-expired record in the `sessions` table, validated by `requireSession` middleware.
- **createOrderSchema**: The Zod validation schema applied to the request body of `POST /api/orders`.

## Requirements

### Requirement 1: Table Token Mandatory for Unauthenticated Orders

**User Story:** As a restaurant owner, I want unauthenticated diners to prove they are physically at a table by supplying its QR token, so that a diner cannot fraudulently place orders against another table.

#### Acceptance Criteria

1. WHEN an unauthenticated request is received by the Order_API without a `tableToken` field, THEN THE Order_API SHALL reject the request with HTTP 401 and an error message indicating that a table token is required.
2. WHEN an unauthenticated request is received by the Order_API with a `tableToken` that does not match any active table's `qr_token`, THEN THE Order_API SHALL reject the request with HTTP 401 and the error message `"Invalid table"`.
3. WHEN an unauthenticated request is received by the Order_API with a valid `tableToken` that matches an active table, THEN THE Order_API SHALL create the order and associate it with that table.
4. WHEN an unauthenticated request is received by the Order_API with a `tableNumber` field but no `tableToken` field, THEN THE Order_API SHALL reject the request with HTTP 401 and an error message indicating that a table token is required.

### Requirement 2: Table Number Restricted to Authenticated Staff

**User Story:** As a waiter, I want to place orders by typing a table number from the waiter panel, so that I can assist diners without needing to scan a QR code myself.

#### Acceptance Criteria

1. WHEN an authenticated Staff request is received by the Order_API with a valid `tableNumber` and no `tableToken`, THEN THE Order_API SHALL create the order and associate it with the table identified by that `tableNumber`.
2. WHEN an authenticated Staff request is received by the Order_API with a `tableNumber` that does not match any active table, THEN THE Order_API SHALL reject the request with HTTP 400 and the error message `"Invalid table"`.
3. WHEN an authenticated Staff request is received by the Order_API with both a `tableToken` and a `tableNumber`, THEN THE Order_API SHALL resolve the table using the `tableToken` and ignore the `tableNumber`.
4. WHILE a Staff session is active, THE Order_API SHALL permit authenticated Staff to place orders using `tableNumber` alone without requiring a `tableToken`.

### Requirement 3: Schema Validation Reflects the New Rules

**User Story:** As a developer, I want the request schema to enforce the new token/number rules at the parsing layer, so that invalid requests are rejected before any database lookup occurs.

#### Acceptance Criteria

1. THE createOrderSchema SHALL require the `tableToken` field to be a non-empty string when present.
2. THE createOrderSchema SHALL require the `tableNumber` field to be a positive integer when present.
3. WHEN a request body contains neither `tableToken` nor `tableNumber`, THEN THE createOrderSchema SHALL reject the body with a validation error before the Order_API performs any database query.
4. WHEN the Order_API receives a request body that fails createOrderSchema validation, THEN THE Order_API SHALL return HTTP 400 with a descriptive validation error message.

### Requirement 4: Existing Customer Page Path Is Unaffected

**User Story:** As a diner who scanned a QR code, I want my orders to work exactly as before, so that the security change is invisible to me.

#### Acceptance Criteria

1. WHEN a Customer accesses the ordering page via a URL containing a valid `?t=<tableToken>` parameter, THEN THE Order_API SHALL accept orders submitted with that token without requiring any session cookie.
2. WHEN a Customer submits an order using a `tableToken` obtained from the `?t=` URL parameter, THEN THE Order_API SHALL associate the order with the correct table identified by that token.
3. THE Order_API SHALL NOT require a session cookie for requests that include a valid `tableToken`.

### Requirement 5: Rate Limiting Continues to Key by Table Token

**User Story:** As a restaurant owner, I want the per-table rate limiter to continue functioning correctly after the authentication change, so that a single table cannot flood the kitchen with orders.

#### Acceptance Criteria

1. WHILE a valid `tableToken` is present in the request body, THE Order_API SHALL apply the per-table rate limit keyed on `table:<tableToken>` as before.
2. IF a request does not include a `tableToken` (i.e., an authenticated Staff request using only `tableNumber`), THEN THE Order_API SHALL apply the rate limit keyed on the requestor's IP address.
3. THE Order_API SHALL enforce a maximum of 10 order requests per table token per 60-second window.

### Requirement 6: Audit and Error Transparency

**User Story:** As a system operator, I want rejected unauthenticated table-number requests to be observable, so that I can detect and investigate spoofing attempts.

#### Acceptance Criteria

1. WHEN the Order_API rejects an unauthenticated request due to a missing or absent `tableToken`, THEN THE Order_API SHALL log the rejection at the `warn` level including the supplied `tableNumber` value (if any) and the request IP address.
2. THE Order_API SHALL NOT expose internal database identifiers or stack traces in error responses returned to unauthenticated clients.
