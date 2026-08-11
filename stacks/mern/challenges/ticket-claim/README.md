# Ticket Claim Desk

Build a tiny **ticket claim desk**: list support tickets, filter by status, show open/claimed counts, and **claim** an open ticket.

## Live budget

Intrinsic **Medium** / live **~60m Medium–Hard** / take-home **Easy–Medium**.  
**≤10 tests.** One mutation (`claim`) + one **409** path. No version/`412`, no Edit form.

## Architecture (source of truth)

| Outcome | Status | Body |
|---------|--------|------|
| List / summary / claim success | `200` | `TicketRecord[]` / `TicketSummary` / `TicketRecord` |
| Invalid `status` query or missing `member_id` | **`400`** | `{ message }` |
| Ticket not found | **`404`** | `{ message }` |
| Ticket no longer open | **`409`** | `{ message, latest }` |

Claim updates only while `status` is still `open` (atomic write).  
**Summary** is global (all tickets), not scoped to the list filter.

## Stack notes

- Native MongoDB driver (no Mongoose)
- Keep `_id` in JSON
- Express + React (Vite) + Tailwind

## Domain

Types: `exercise/types.ts` (also via `@shared/types`).

### `members` (seeded)

| Field | Notes |
|-------|-------|
| `_id` | e.g. `m1` |
| `display_name` | |

### `tickets` (seeded)

| Field | Notes |
|-------|-------|
| `_id` | e.g. `t1` |
| `title` | |
| `priority` | `high` \| `medium` \| `low` |
| `status` | `open` \| `claimed` |
| `claimed_by_id` | `null` when open |
| `claimed_by_name` | `null` when open |
| `created_at` | ISO |

## API

- `GET /api/tickets` → `created_at` **desc**
  - Query `status` optional; default `all`
  - `all` \| `open` \| `claimed` → else **`400`**
- `GET /api/tickets/summary` → `{ open, claimed }`
- `POST /api/tickets/:id/claim` body `{ member_id }`
  - Unknown member → **`400`**
  - Missing ticket → **`404`**
  - Success → `200` full ticket (`status: claimed`, claimer fields set)
  - Not open → **`409`** `{ message: "Ticket is no longer open.", latest }`

## Product

1. Load summary + tickets (`status=all`) on first render  
2. Status filter updates the list; summary stays global  
3. **Claim ticket** on an open row (`CURRENT_MEMBER_ID = "m1"`)  
4. On **409**, show `conflict-message`  
5. After claim attempts, list + summary stay in sync with the API  
6. Rows: title + status; show claimer name when the ticket has one  

## UI hooks

| Hook | |
|------|--|
| `combobox` | Status filter |
| `ticket-list` | |
| `{id}-ticket-row` | |
| `{id}-ticket-title`, `{id}-ticket-status` | **required** |
| `{id}-ticket-claimed-by` | when `claimed_by_name` is present |
| `summary-open`, `summary-claimed` | |
| `button` | Claim ticket |
| `conflict-message` | |

## Difficulty

Intrinsic **Medium** · live **~60m Medium–Hard** · take-home **Easy–Medium**.

## Tasks

See `shared/ticket-claim.ts`.

## Workflow

```bash
pnpm challenge ticket-claim --prepare
pnpm dev
pnpm test:challenge:watch
```

Solve only under `challenges/ticket-claim/exercise/`.
