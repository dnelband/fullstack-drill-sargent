# Order Lines

Build a **draft order desk**: list orders, filter by status, expand to manage nested line items while the order is a draft, then submit. Parent version gates every child write.

## Live budget

Intrinsic **Hard** / live **~70–80m** / take-home **Medium**.  
**19 tests.** Nested lines · parent OCC · **403** / **409** / **410** / **412** / **422** · distinct UI hooks.

## Architecture (source of truth)

| Outcome | Status | Body |
|---------|--------|------|
| List / summary / get / line mutate / submit success | `200` | `DraftOrderRecord[]` / `DraftOrderSummary` / `DraftOrderRecord` / `CatalogProduct[]` |
| Invalid `status` query, bad body, unknown product, qty &lt; 1 | **`400`** | `{ message }` |
| `owner_id` is not the order owner | **`403`** | `{ message }` |
| Missing order or line | **`404`** | `{ message }` |
| Duplicate `product_id` already on the order | **`409`** | `{ message, latest }` |
| Order is **cancelled** (child mutate or submit) | **`410`** | `{ message, latest }` |
| Stale `expected_version` while order is still **draft** | **`412`** | `{ message, latest }` |
| Order is **submitted** (child mutate) | **`422`** | `{ message, latest }` |

### Parent / child rules

- Lines live in `order_lines` and belong to one order. Mutate only via nested routes under `/api/orders/:id/...`.
- Every successful line add / patch / delete / submit bumps the **parent** `version` and recomputes `total_cents` on the server.
- Child writes and submit require `owner_id` + `expected_version` and succeed only while the order is **draft** (submit also transitions to `submitted`).
- On a failed child write, diagnose in order: missing → **404**; wrong owner → **403**; **cancelled → 410**; not draft (submitted) → **422**; version mismatch → **412**.
- A cancelled order with a stale `expected_version` is still **410** (not 412).

**Summary** is global. Successful mutations return the **full** `DraftOrderRecord` (including `lines[]`).

## Stack notes

- Native MongoDB driver (no Mongoose)
- Keep `_id` in JSON
- Express + React (Vite) + Tailwind

## Domain

Types: `exercise/types.ts` (also via `@shared/types`).  
Constant: `CURRENT_OWNER_ID` in `@shared/order-lines`.

### `members` (owners)

| Field | Notes |
|-------|-------|
| `_id` | e.g. `m1` |
| `display_name` | |

### `products` (catalog, read-only)

| Field | Notes |
|-------|-------|
| `_id` | e.g. `p1` |
| `name` | |
| `unit_price_cents` | integer |

### `orders`

| Field | Notes |
|-------|-------|
| `_id` | e.g. `o1` |
| `customer_name` | |
| `status` | `draft` \| `submitted` \| `cancelled` |
| `owner_id` / `owner_name` | |
| `total_cents` | server sum of line totals |
| `notes` | |
| `version` | optimistic concurrency for child writes + submit |
| `updated_at` | ISO |

### `order_lines`

| Field | Notes |
|-------|-------|
| `_id` | e.g. `ol1` |
| `order_id` | parent |
| `product_id` / `product_name` | |
| `quantity` | integer ≥ 1 |
| `unit_price_cents` | snapshotted from catalog at add |
| `line_total_cents` | `quantity * unit_price_cents` |

API responses embed `lines[]` on each `DraftOrderRecord` (sorted by `_id` asc).

## API

- `GET /api/products` → catalog ordered by `name` asc
- `GET /api/orders` → ordered by `updated_at` desc
  - Query `status` optional; default `all`
  - `all` \| `draft` \| `submitted` \| `cancelled` → else **`400`**
- `GET /api/orders/summary` → `{ draft, submitted, cancelled }`
- `GET /api/orders/:id` → one order with `lines[]`
- `POST /api/orders/:id/lines` body `{ owner_id, expected_version, product_id, quantity }`
  - Success → `200` full order (bumped version, new line, new total)
  - Duplicate product on order → **`409`** `{ message, latest }`
- `PATCH /api/orders/:id/lines/:lineId` body `{ owner_id, expected_version, quantity }`
- `DELETE /api/orders/:id/lines/:lineId` body `{ owner_id, expected_version }`
- `POST /api/orders/:id/submit` body `{ owner_id, expected_version }`
  - Success → `200` order with `status: submitted`

## Product

1. Load summary + orders (`status=all`) + products on first render  
2. Status filter updates the list; summary stays global  
3. Expand → read-only details + lines (`{id}-details-view`)  
4. **Edit** on a **draft** you own → form: add line, change qty, remove line, **Submit order**  
5. Mutations send `CURRENT_OWNER_ID`, `expected_version`, and draft field values  
6. On **409** → `conflict-message`; **412** → `stale-message`; **410** → `gone-message`; **422** → `locked-message`  
7. After mutate/submit attempts, list + summary stay in sync with the API  

## UI hooks

| Hook | |
|------|--|
| `combobox` | Status filter |
| `order-list` | |
| `{id}-order-row` | |
| `{id}-order-customer`, `{id}-order-status`, `{id}-order-total` | **required** |
| `button` | Expand, Edit, Add line, Save line, Remove line, Submit order |
| `{id}-details-view` | read-only after Expand |
| `{id}-details-form` | after Edit |
| `{id}-add-product`, `{id}-add-quantity` | add-line controls |
| `{id}-line-{lineId}-quantity` | draft qty on form |
| `{id}-version` | |
| `summary-draft`, `summary-submitted`, `summary-cancelled` | |
| `conflict-message` / `stale-message` / `gone-message` / `locked-message` | |

Form appears **only after Edit**, never on Expand alone.

## Claim identity

```ts
import { CURRENT_OWNER_ID } from "../../shared/order-lines.ts"; // "m1"
```

## Tasks

See `shared/order-lines.ts` (`challengeTasks`).

## Workflow

```bash
pnpm challenge order-lines --prepare
pnpm test:challenge
```
