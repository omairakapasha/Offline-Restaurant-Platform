# Self-Hosted Restaurant Ordering System

[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%E2%89%A524-339933.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgres-15-4169E1.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED.svg)](https://www.docker.com/)

QR-code dine-in ordering with real-time kitchen dispatch. A diner scans the code on their table, orders from their phone — no app, no account — and the kitchen sees it appear over WebSocket a second later. Staff run menu, tables, orders, inventory, and people from a single admin dashboard.

It is fully self-hosted: one server, your database, no per-order fees. Cash-only, dine-in for now.

## Quickstart

```bash
cp .env.example .env
# set at minimum: SESSION_SECRET, DEFAULT_ADMIN_PASSWORD, DEFAULT_KITCHEN_PASSWORD
docker compose up
```

Postgres, the API, and the AI service start in dependency order. Open `http://localhost:5000` and sign in at `/admin`. The first run seeds an admin and kitchen account, 20 tables with QR codes, and 12 sample menu items.

## Why this exists

Hosted competitors (Qlub, me&u, Sunday) are cloud-only and take a cut of every order. This is the self-hostable alternative:

- **No per-order fees.** You run it; there is no middleman on the transaction.
- **You own the data.** Customer and order data stays in your database.
- **One artifact.** Pages are server-rendered — no separate frontend to build or deploy.
- **Works offline.** The AI menu assistant falls back to a local model when the internet is down.
- **Built for the floor.** Stock can't oversell under load, and rate limits don't lock out a room sharing one WiFi IP.

## Architecture

A pnpm workspace of three services plus Postgres.

| Package | Stack | Role |
|---|---|---|
| `artifacts/api-server` | Express 5 + TypeScript | Auth, menu, order lifecycle, WebSocket dispatch, server-rendered pages (port 5000) |
| `packages/ai-chat` | FastAPI + Python | Menu assistant: menu cache, conversation state, cloud/local model routing (port 8001) |
| `lib/db` | Drizzle ORM | Shared schema and SQL migrations |

```
browser ──HTTP/WS──> Express API (5000) ──> PostgreSQL
                          │
                          └──proxy──> AI service (8001) ──> Gemini ──┐
                                                                     └─> local LLM (Ollama)
```

The Express server handles everything except AI inference, which it proxies to the Python service. That service uses Gemini when reachable and falls back to a local model (via Ollama) on outage, quota, or a missing API key — so menu questions keep getting answered with no internet at all.

## Pages

| Route | Audience | Purpose |
|---|---|---|
| `/` | Diners | Menu, cart, checkout |
| `/track` | Diners | Live order status and "ready" push notifications |
| `/kitchen` | Kitchen | Real-time ticket queue |
| `/waiter` | Floor staff | Read-only order view |
| `/admin` | Managers | Menu, tables, staff, inventory, analytics, audit log, CSV export |

## Local development

Requires Node ≥ 24, pnpm ≥ 9, Python 3.10+, PostgreSQL 15+.

```bash
pnpm install
pip install -r packages/ai-chat/requirements.txt

cp .env.example artifacts/api-server/.env
# edit DATABASE_URL, SESSION_SECRET, DEFAULT_*_PASSWORD

# API (runs DB migrations on startup)
pnpm --filter @workspace/api-server run dev

# AI service, separate terminal (optional)
cd packages/ai-chat && uvicorn main:app --port 8001
```

## Configuration

Environment variables go in `artifacts/api-server/.env` (local) or the root `.env` (Docker). Essentials:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | yes | ≥ 32 chars; the server refuses to start without it |
| `DEFAULT_ADMIN_PASSWORD` | first run | Seeds the admin login |
| `DEFAULT_KITCHEN_PASSWORD` | first run | Seeds the kitchen login |
| `GEMINI_API_KEY` | no | Primary AI backend; unset means fully local |
| `OLLAMA_BASE_URL` | no | Local fallback model server |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | no | Enables order-ready push (`npx web-push generate-vapid-keys`) |
| `INTERNAL_API_SECRET` | no | Shared secret guarding the Express → Python hop |

See [`.env.example`](.env.example) for the full, commented list.

## Design notes

A few decisions that shaped the implementation:

- **No oversell.** Finite stock decrements inside the order transaction under a `WHERE stock_quantity >= requested` guard, so concurrent orders for the last item can't both succeed.
- **Per-entity rate limits.** Limiters key on the table's QR token, order ID, or chat session — not IP, since every diner shares one WiFi egress.
- **Authenticated WebSocket upgrade.** The kitchen feed authenticates during the HTTP upgrade itself; any other upgrade path is dropped.
- **Append-only history.** Menu items are soft-deleted, order-line prices are snapshotted at order time, and the audit log never updates or deletes.
- **DB-backed sessions.** Cookie sessions live in Postgres, so password resets and deactivations revoke access immediately and restarts log nobody out.

## Roadmap

Tracked in [`PLAN.md`](PLAN.md). Near-term: harden the AI endpoint and close a table-number spoofing gap. Later: a pluggable payment layer, demand forecasting, an upselling assistant, loyalty, i18n/RTL, and multi-branch support.

## License

[GNU AGPL-3.0](LICENSE). Copyright © 2026 Omair. You may use, modify, and self-host this; running a modified version as a network service requires making your source available to its users.
