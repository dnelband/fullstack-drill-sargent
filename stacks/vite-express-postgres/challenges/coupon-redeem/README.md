# Coupon Redeem Desk

Build a **coupon redeem desk**: list coupons, filter by status, show summary counts, redeem with an idempotency key, and show redemption history.

## Live budget

Intrinsic **Hard** / live **~75–90m** / take-home **Medium**.  
**14 tests.** Redeem mutation + idempotency + exhaustion/expiry paths.

## Architecture (source of truth)

| Outcome | Status | Body |
|---------|--------|------|
| List / summary / redeem success / idempotent replay | `200` | `CouponRecord[]` / `CouponSummary` / `RedemptionRecord` |
| Missing `Idempotency-Key`, bad body, invalid status query | **`400`** | `{ message }` |
| Unknown coupon `code` | **`404`** | `{ message }` |
| Expired, exhausted, per-user limit, or idempotency key reused with a different body | **`422`** | `{ message }` |

Redeem decrements `remaining` only when the coupon is still redeemable.  
**Summary** is global.

## Stack notes

- Native Postgres driver (no Postgresose)
- Keep `id` in JSON
- Express + React (Vite) + Tailwind

## Domain

Types: `exercise/types.ts` (also via `@shared/types`).

### `coupons` (seeded)

| Field | Notes |
|-------|-------|
| `id` | e.g. `c1` |
| `code` | unique, uppercase |
| `title` | |
| `discount_percent` | |
| `remaining` | integer ≥ 0 |
| `max_per_user` | |
| `expires_at` | ISO |
| `status` | `active` \| `expired` \| `exhausted` |

### `redemptions` (seeded empty / grows on redeem)

| Field | Notes |
|-------|-------|
| `id` | |
| `couponid` | |
| `code` | |
| `userid` | |
| `discount_percent` | |
| `idempotency_key` | |
| `redeemed_at` | ISO |

## API

- `GET /api/coupons` → ordered by `code` **asc**
  - Query `status` optional; default `all`
  - `all` \| `active` \| `expired` \| `exhausted` → else **`400`**
- `GET /api/coupons/summary` → `{ active, expired, exhausted, redemptions }`
- `GET /api/redemptions` → ordered by `redeemed_at` **desc**
- `POST /api/coupons/redeem`
  - Header `Idempotency-Key` required
  - Body `{ code, userid }`
  - Success / replay → **`200`** `RedemptionRecord`
  - See status table above for failures

## Product

1. Load summary + coupons (`status=all`) + redemptions on first render  
2. Status filter updates the coupon list; summary stays global  
3. Redeem form: coupon code + Redeem (acting user `CURRENT_USER_ID = "u1"`)  
4. Each redeem attempt sends a client-generated `Idempotency-Key`  
5. On **422**, show `unprocessable-message`  
6. After redeem attempts, coupon list, summary, and redemptions stay in sync with the API  
7. Coupon rows: code, status, remaining tiles  

## UI hooks

| Hook | |
|------|--|
| `combobox` | Status filter |
| `coupon-list` | |
| `{id}-coupon-row` | |
| `{id}-coupon-code`, `{id}-coupon-status`, `{id}-coupon-remaining` | **required** |
| `redemption-list` | |
| `{id}-redemption-row` | |
| `summary-active`, `summary-expired`, `summary-exhausted`, `summary-redemptions` | |
| textbox | Coupon code |
| `button` | Redeem coupon |
| `unprocessable-message` | |

## Difficulty

Intrinsic **Hard** · live **~75–90m** · take-home **Medium**.

## Tasks

See `shared/coupon-redeem.ts`.

## Workflow

```bash
pnpm challenge coupon-redeem --prepare
pnpm dev
pnpm test:challenge:watch
```

Solve only under `challenges/coupon-redeem/exercise/`.
