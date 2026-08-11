# Orders Inbox

Build a tiny **orders inbox**: list orders, filter by status, show a summary strip, and expand a row for read-only details.

## Live budget

Intrinsic **Medium** / live **~60m Medium–Hard** / take-home **Easy–Medium**.  
**≤8 tests.** No claim, version, PATCH, or Edit form.

## Architecture (source of truth)

Successful GETs return **complete** `OrderRecord`s / `OrderSummary`. Invalid status query → **`400`**. The UI renders list + summary from API responses only.

| Outcome | Status | Body |
|---------|--------|------|
| List / summary success | `200` | `OrderRecord[]` or `OrderSummary` |
| Invalid `status` query | **`400` Bad Request** | `{ message }` |

**Summary** is global (all orders), not scoped to the active list filter.

## Stack notes

- Native Postgres driver (no Postgresose)
- Keep `id` in JSON
- Express + React (Vite) + Tailwind

## Domain

### `orders` (seeded)

| Field | Notes |
|-------|-------|
| `id` | e.g. `ord1` |
| `customer_name` | |
| `status` | `open` \| `paid` \| `shipped` \| `cancelled` |
| `total_cents` | integer |
| `created_at` | ISO string |
| `notes` | |

## API

- `GET /api/orders` → orders ordered by `created_at` **desc**
  - Query `status` optional; default `all` (no status filter)
  - `status` must be `all` or a valid `OrderStatus` → else **`400`**
- `GET /api/orders/summary` → `{ open, paid, shipped, cancelled, total_cents }`
  - counts by status across **all** orders; `total_cents` is sum of every order’s `total_cents`

## Product

1. On first render, load **summary** + **orders** (`status=all`)  
2. Status filter combobox changes the list query; summary stays global  
3. Expand → read-only details (`notes`, totals, dates) — **no Edit / no form**  
4. List rows must show customer, status, and total tiles

## UI hooks

| Hook | |
|------|--|
| `combobox` | Status filter |
| `order-list` | |
| `{id}-order-row` | |
| `{id}-order-customer`, `{id}-order-status`, `{id}-order-total` | **required** list tiles |
| `summary-open`, `summary-paid`, `summary-shipped`, `summary-cancelled`, `summary-total-cents` | |
| `button` | Expand |
| `{id}-details-view` | read-only after Expand |
| *(no)* `{id}-details-form` | Expand must **not** open a form |

## Difficulty

Intrinsic **Medium** · live **~60m Medium–Hard** · take-home **Easy–Medium**.

## Tasks

See `shared/orders-inbox.ts`.

## Workflow

```bash
cp .env.example .env
pnpm install && pnpm db:prepare && pnpm dev
pnpm test:challenge:watch
```

Solve only under `challenges/orders-inbox/exercise/`.
