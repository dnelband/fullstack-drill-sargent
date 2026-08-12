# Hold Queue

Build a **soft-hold queue**: list work items, filter by effective status, hold an available item for a TTL, and edit notes while your hold is active.

## Live budget

Intrinsic **Hard** / live **~75m** / take-home **Medium**.  
**14 tests.** Hold conflict **409** · expired hold **410** · stale notes **412**.

## Architecture (source of truth)

| Outcome | Status | Body |
|---------|--------|------|
| List / summary / hold success / patch success | `200` | `HoldQueueItem[]` / `HoldQueueSummary` / `HoldQueueItem` |
| Invalid `status` query, missing/unknown `member_id`, bad patch body | **`400`** | `{ message }` |
| Item not found | **`404`** | `{ message }` |
| Item has an **active** hold by someone else | **`409`** | `{ message, latest }` |
| Notes save with stale `expected_version` (hold still active) | **`412`** | `{ message, latest }` |
| Notes save when hold is no longer active (expired or open) | **`410`** | `{ message, latest }` |

### Active hold (server clock)

A hold is **active** only when `status === "held"` **and** `held_until` is strictly after server now.

- **Available** to hold: not actively held (includes `open`, and `held` with `held_until` in the past).
- `GET` filter/`summary` use this effective status (`open` vs `held`), not raw storage alone.
- Successful hold sets `held_until` to now + `HOLD_TTL_MS` (`60000` from `@shared/hold-queue`).

**Summary** is global.

## Stack notes

- Native MongoDB driver (no Mongoose)
- Keep `_id` in JSON
- Express + React (Vite) + Tailwind

## Domain

Types: `exercise/types.ts` (also via `@shared/types`).  
Constants: `CURRENT_MEMBER_ID`, `HOLD_TTL_MS` in `@shared/hold-queue` (re-exported).

### `members` (seeded)

| Field | Notes |
|-------|-------|
| `_id` | e.g. `m1` |
| `display_name` | |

### `queue_items` (seeded)

| Field | Notes |
|-------|-------|
| `_id` | e.g. `q1` |
| `title` | |
| `priority` | `high` \| `medium` \| `low` |
| `status` | `open` \| `held` |
| `held_by_id` / `held_by_name` | `null` when open |
| `held_until` | ISO or `null` when open |
| `notes` | |
| `version` | optimistic concurrency for notes |
| `created_at` | ISO |

## API

- `GET /api/queue` → `created_at` **desc**
  - Query `status` optional; default `all`
  - `all` \| `open` \| `held` (effective) → else **`400`**
- `GET /api/queue/summary` → `{ open, held }` (effective counts)
- `POST /api/queue/:id/hold` body `{ member_id }`
  - Success → `200` item (`status: held`, holder fields, `held_until`, bumped `version`)
  - Active hold by peer → **`409`** `{ message, latest }`
  - Missing item → **`404`**
- `PATCH /api/queue/:id` body `{ member_id, expected_version, notes }`
  - Success only while **your** hold is active and version matches → `200` bumped version
  - Stale version, hold still active → **`412`** `{ message, latest }`
  - Hold no longer active → **`410`** `{ message, latest }`
  - Missing item → **`404`**

## Product

1. Load summary + queue (`status=all`) on first render  
2. Status filter updates the list; summary stays global  
3. **Hold item** on an available row (`CURRENT_MEMBER_ID = "m1"`)  
4. On **409**, show `conflict-message`  
5. Expand a **held** row → read-only details + **Edit** → notes form + Save  
6. Successful save sends draft `notes` + `expected_version` + `member_id` and reflects bumped version  
7. On **412**, show `stale-message`; on **410**, show `gone-message`  
8. After hold/save attempts, list + summary stay in sync with the API  
9. Rows: title, status; holder name when actively held  

## UI hooks

| Hook | |
|------|--|
| `combobox` | Status filter |
| `queue-list` | |
| `{id}-queue-row` | |
| `{id}-queue-title`, `{id}-queue-status` | **required** |
| `{id}-queue-holder` | when an active hold has a holder name |
| `button` | Hold item, Expand, Edit, Save detail changes |
| `{id}-details-view` | read-only after Expand |
| `{id}-details-form` | after Edit |
| `{id}-notes`, `{id}-version` | draft / display |
| `summary-open`, `summary-held` | |
| `conflict-message` / `stale-message` / `gone-message` | |

Form appears **only after Edit**, never on Expand alone.

## Claim identity

```ts
import { CURRENT_MEMBER_ID } from "@shared/hold-queue"; // "m1"
```

## Tasks

See `shared/hold-queue.ts` (`challengeTasks`).

## Workflow

```bash
pnpm challenge hold-queue --prepare
pnpm dev
pnpm test:challenge:watch
```

Solve under `challenges/hold-queue/exercise/`. Do not edit `.solutions/` while practicing.
