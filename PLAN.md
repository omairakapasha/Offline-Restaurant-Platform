# PLAN — Future Work

Backlog for the Self-Hosted Restaurant Ordering System. Ordered by priority.
Status legend: `[done]` `[next]` `[later]`. File/line refs point at where the
change lands.


## 0. Security (done)

- `[done]` **Table-number spoofing.** `POST /api/orders` previously trusted a typed
  `tableNumber` with no verification, so a diner could place orders against another
  table. Fixed in `artifacts/api-server/src/routes/orders.ts`: a `trySession`
  middleware optionally loads the staff session; unauthenticated callers must now
  supply a valid QR `tableToken` (else `401`), and the `tableNumber` path is
  restricted to authenticated staff. Token-based lookup always takes precedence.
  Covered by `src/routes/__tests__/orders.auth.test.ts`.

---

## 1. Local-LLM polish (later)

- `[later]` **On-screen "backend" badge.** Surface `backend: "local"` in the
  customer chat UI (`pages/customer.ts`) — on-camera proof the local model is
  answering offline; also genuinely useful UX.
- `[later]` **Ollama in Docker.** Optional `ollama` service in
  `docker-compose.yml` (`OLLAMA_BASE_URL=http://host.docker.internal:11434` or a
  container). Native Ollama on the host is fine for the demo.
- `[later]` **Pre-warm / keep_alive.** Cold load is ~10s. Set a long Ollama
  `keep_alive` or send a warm-up request on service start so the first real reply
  isn't slow.
- `[later]` **Prompt tuning for 3B.** The small model rambles and occasionally
  embellishes (claimed a dish "contains yogurt" not in the menu). Tighten the
  system prompt; consider few-shot examples.

---

## 2. Product bets (later — from market/trend research)

Bigger swings. Each is its own spec → plan → build cycle. Do NOT start until the
single-restaurant story is solid.

- `[later]` **Pluggable payment layer.** Country-agnostic abstraction (Stripe /
  Apple Pay / UPI / Raast-JazzCash). Closes the ordering loop; the single biggest
  product gap. Removes the per-order-fee that funded competitors charge.
- `[later]` **Demand forecasting / waste reduction.** Use the order history
  already stored (`orders`, `order_items`, timestamps) for per-item, per-weekday
  prediction + low-stock alerts. Highest ROI; reuses existing data.
- `[later]` **Agentic AI upsell.** Let the assistant suggest pairings and add to
  the cart, not just answer questions. Converts a cost center into check-size lift.
- `[later]` **Loyalty layer.** Keyed on the `customer_phone` already captured.
  Visit count, "your usual" re-order. Counters QR-menu loyalty erosion.
- `[later]` **i18n + multi-currency + RTL.** Currently English-only. Required for
  any "global / works in any language" claim; Arabic/RTL matters for MENA.
- `[later]` **Multi-tenancy / multi-branch.** Restaurant + branch entities, scoped
  data. Turns a product into a platform. Largest architectural change — defer
  until a single location is proven.

---

## Notes

- This repo is licensed **AGPL-3.0**.
- Keep claims matched to the deployed config (e.g., don't say "no cloud" while
  `GEMINI_API_KEY` is set — the open code would contradict it).
