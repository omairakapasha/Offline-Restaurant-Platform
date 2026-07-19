# Restaurant Ordering System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%E2%89%A524-339933.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgres-15-4169E1.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED.svg)](https://www.docker.com/)

QR-code dine-in ordering with real-time kitchen dispatch. A diner scans the code on their table, browses the menu with full item details, adds items to cart, and places an order — no app install, no account. The kitchen sees it appear over WebSocket a second later. Staff manage menu, tables, orders, inventory, and people from a single admin dashboard.

Fully self-hosted: one server, your database, no per-order fees. Cash-only, dine-in.

## System Demo

<p align="center">
  <video src="./assets/Self%20Hosted%20Ordering%20System.mp4" width="100%" controls autoplay loop></video>
</p>

## Quickstart

```bash
cp .env.example .env
# Edit: SESSION_SECRET, DEFAULT_ADMIN_PASSWORD, DEFAULT_KITCHEN_PASSWORD
docker compose up -d
```

Open `http://localhost:5000`. Sign in at `/admin` with the credentials you set. First run seeds an admin, kitchen, and waiter account, 20 tables with QR codes, and sample menu items.

> For the non-Docker setup guide, see [ONBOARDING.md](ONBOARDING.md).

## Architecture

A pnpm monorepo with two services and a shared database library, all backed by PostgreSQL.

```
browser ──HTTP/WS──> Express API (:5000) ──> PostgreSQL
                          │
                          └──proxy──> AI service (:8001) ──> Gemini
                                                               └─> Ollama (local fallback)
```

| Package | Stack | Role |
|---|---|---|
| `artifacts/api-server` | Express 5 · TypeScript | Auth, menu, orders, WebSocket dispatch, server-rendered pages |
| `packages/ai-chat` | FastAPI · Python | Menu assistant: conversation state, Gemini / local model routing |
| `lib/db` | Drizzle ORM | Shared schema, migrations, and connection pool |

### Project structure

```
├── artifacts/api-server/src/
│   ├── config.ts                   # Centralized env config
│   ├── index.ts                    # Express app entry, middleware, route wiring
│   ├── seed.ts                     # First-run database seeder
│   ├── lib/
│   │   ├── auditLog.ts             # Append-only audit log writer
│   │   ├── csv.ts                  # CSV export helper
│   │   ├── logger.ts               # Pino logger
│   │   ├── migrate.ts              # Drizzle migration runner
│   │   ├── push.ts                 # Web Push (VAPID) notifications
│   │   └── websocket.ts            # WebSocket manager + broadcast
│   ├── middlewares/
│   │   ├── csrfCheck.ts            # Origin / referer CSRF guard
│   │   ├── errorHandler.ts         # asyncHandler + AppError + global error handler
│   │   ├── requireRole.ts          # Role-based access control
│   │   └── requireSession.ts       # Cookie-session authentication
│   ├── pages/                      # Server-rendered HTML pages (no frontend build)
│   │   ├── theme.ts                # Shared design tokens, fonts, icons
│   │   ├── customer.ts             # Menu, item detail popup, cart, checkout
│   │   ├── kitchen.ts              # Real-time order ticket queue
│   │   ├── waiter.ts               # Read-only order view
│   │   ├── admin.ts                # Full management dashboard
│   │   ├── track.ts                # Live order tracking + push notifications
│   │   └── receipt.ts              # Printable order receipt
│   └── routes/
│       ├── auth.ts                 # Login / logout / session check
│       ├── menu.ts                 # CRUD menu items, image upload, stock guard
│       ├── orders.ts               # Order lifecycle, status transitions, cancel
│       ├── tables.ts               # CRUD tables, QR generation, smart delete
│       ├── kitchen.ts              # Kitchen-specific order queries
│       ├── admin.ts                # Staff, analytics, inventory, audit, CSV export
│       ├── aiChat.ts               # Proxy to AI chat service
│       ├── push.ts                 # Push subscription registration
│       └── __tests__/              # Integration tests
├── lib/db/src/
│   ├── index.ts                    # Pool, drizzle instance, schema barrel re-exports
│   └── schema/                     # 9 Drizzle table definitions
│       ├── staff.ts, sessions.ts, tables.ts, orders.ts,
│       ├── order-items.ts, order-status-history.ts,
│       ├── menu-items.ts, audit-log.ts, push-subscriptions.ts
│       └── index.ts                # Barrel re-export
├── packages/ai-chat/               # Python FastAPI AI service
├── docker-compose.yml
├── .env.example
└── ONBOARDING.md                   # Non-technical setup guide
```

## Pages

| Route | Audience | Features |
|---|---|---|
| `/` | Diners | Browse menu with search/filters, tap item for detail popup (description, allergens, prep time), +/- cart, checkout |
| `/track` | Diners | Live order status tracking and "ready" push notifications |
| `/kitchen` | Kitchen | Real-time ticket queue via WebSocket, status transitions |
| `/waiter` | Floor staff | Read-only live order view |
| `/admin` | Managers | Menu CRUD, tables (add/edit/delete), staff management, inventory, analytics charts, audit log, CSV export |

## Configuration

Environment variables go in `.env` (Docker) or `artifacts/api-server/.env` (local dev). See [`.env.example`](.env.example) for the full commented list.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | yes | ≥ 32 chars; server refuses to start without it |
| `DEFAULT_ADMIN_PASSWORD` | first run | Seeds the admin login |
| `DEFAULT_KITCHEN_PASSWORD` | first run | Seeds the kitchen login |
| `DEFAULT_WAITER_PASSWORD` | first run | Seeds the waiter login |
| `BRAND_NAME` | no | Restaurant name shown in headers and titles |
| `BRAND_TAGLINE` | no | Tagline shown on the customer page |
| `CURRENCY_SYMBOL` | no | Currency label shown with prices (default: `QAR`) |
| `GEMINI_API_KEY` | no | AI menu assistant; unset = fully local via Ollama |
| `OLLAMA_BASE_URL` | no | Local fallback model server (default: `localhost:11434`) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | no | Enables order-ready push notifications |
| `INTERNAL_API_SECRET` | no | Shared secret for Express → AI service proxy |

## Local development

Requires Node ≥ 24, pnpm ≥ 9, Python 3.10+, PostgreSQL 15+.

```bash
pnpm install
pip install -r packages/ai-chat/requirements.txt

cp .env.example artifacts/api-server/.env
# Edit: DATABASE_URL, SESSION_SECRET, DEFAULT_*_PASSWORD

# API server (runs migrations on startup)
pnpm --filter @workspace/api-server run dev

# AI service (optional, separate terminal)
cd packages/ai-chat && uvicorn main:app --port 8001
```

## Design notes

- **No oversell.** Finite stock decrements inside the order transaction under a `WHERE stock_quantity >= requested` guard, so concurrent orders for the last item can't both succeed.
- **Per-entity rate limits.** Limiters key on the table's QR token, order ID, or chat session — not IP, since every diner shares one WiFi egress.
- **Smart table delete.** Tables with no orders are hard-deleted from the database. Tables with order history are soft-deactivated to preserve financial records.
- **Authenticated WebSocket.** The kitchen feed authenticates during the HTTP upgrade; unauthenticated upgrades are dropped.
- **Append-only history.** Menu items are soft-archived, order-line prices are snapshotted at order time, and the audit log never updates or deletes.
- **DB-backed sessions.** Cookie sessions live in Postgres, so password resets and deactivations revoke access immediately and restarts log nobody out.

## Gallery

<details>
<summary>Click to expand and view system screenshots</summary>

<br>

<p align="center">
  <img src="./assets/Screenshot%202026-07-19%20135146.png" width="45%">
  <img src="./assets/Screenshot%202026-07-19%20135232.png" width="45%">
  <img src="./assets/Screenshot%202026-07-19%20135246.png" width="45%">
  <img src="./assets/Screenshot%202026-07-19%20135315.png" width="45%">
  <img src="./assets/Screenshot%202026-07-19%20135335.png" width="45%">
  <img src="./assets/Screenshot%202026-07-19%20135404.png" width="45%">
  <img src="./assets/Screenshot%202026-07-19%20135422.png" width="45%">
  <img src="./assets/Screenshot%202026-07-19%20135537.png" width="45%">
  <img src="./assets/Screenshot%202026-07-19%20141125.png" width="90%">
</p>

</details>
