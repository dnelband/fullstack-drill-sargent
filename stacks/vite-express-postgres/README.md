# Vite + Express + Postgres Challenges

Isolated practice workspace for fullstack interview challenges on Postgres.

## Structure

- `client/`: Vite + React + Tailwind app shell
- `server/`: Express app shell and challenge loader
- `db/`: reset + seed router (per-challenge seeds live under `challenges/<slug>/db/`)
- `challenges/<slug>/exercise/`: implementation path for practice
- `.solutions/<slug>/`: hidden reference implementations
- `tests/`: API + UI coverage (UI mocks `fetch`, not an injected API)

## Setup

1. Copy `.env.example` to `.env` and point `DATABASE_URL` at local Postgres.
2. `pnpm install`
3. Pick a challenge and prepare DB:
   ```bash
   pnpm challenge <slug> --prepare
   ```

## Scripts

- `pnpm challenge` / `pnpm challenge <slug>` / `pnpm challenge --list`
- `pnpm challenge <slug> --prepare` — select + `db:prepare`
- `pnpm dev` — API (`4010`) + Vite client
- `pnpm test:challenge` / `pnpm test:challenge:watch`
- `pnpm test:solution` — same suite against `.solutions/`
- `pnpm build`

## Challenges

| Slug | Title |
|------|-------|
| `dispatch-board` | Dispatch Board |
| `orders-inbox` | Orders Inbox |
| `product-filter` | Product Filter Desk |
| `ticket-claim` | Ticket Claim Desk |
| `coupon-redeem` | Coupon Redeem Desk |
| `brief-desk` | Brief Desk |
| `slug-studio` | Slug Studio |
| `pulse-quiz` | Pulse Quiz |
| `leave-desk` | Leave Desk |

JSON uses SQL-native **`id`** (not Mongo `_id`). Domain types live in `challenges/<slug>/exercise/types.ts` and are re-exported from `shared/types.ts`.
