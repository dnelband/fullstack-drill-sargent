# Seat Hold

Build an **event seat hold desk**: list seats, filter by effective status, soft-hold an available seat for a TTL, and edit notes while your hold is active.

## Live budget

Intrinsic **Hard** / live **~70–80m** / take-home **Medium**.  
**16 tests.** Effective status · concurrent hold · **409** / **412** / **410** · distinct UI hooks.

## Architecture (source of truth)

| Outcome | Status | Body |
|---------|--------|------|
| List / summary / hold success / patch success | `200` | `SeatRecord[]` / `SeatSummary` / `SeatRecord` |
| Invalid `status` query, missing/unknown `member_id`, bad patch body | **`400`** | `{ message }` |
| Seat not found | **`404`** | `{ message }` |
| Seat has an **active** hold | **`409`** | `{ message, latest }` |
| Notes save with stale `expected_version` (hold still active) | **`412`** | `{ message, latest }` |
| Notes save when hold is no longer active (expired or open) | **`410`** | `{ message, latest }` |

### Active hold (server clock)

A hold is **active** only when `status === "held"` **and** `held_until` is strictly after server now.

- **Available** to hold: not actively held (includes `open`, and `held` with `held_until` in the past).
- `GET` filter and `summary` use this **effective** status (`open` vs `held`), not raw storage alone. A seeded row can be `status: "held"` with a past `held_until` and must still count as **open**.
- Successful hold sets `held_until` to now + `SEAT_HOLD_TTL_MS` (`60000` from `@shared/seat-hold`).

**Summary** is global.

## Stack notes

- Native MongoDB driver (no Mongoose)
- Keep `_id` in JSON
- Express + React (Vite) + Tailwind

## Domain

Types: `exercise/types.ts` (also via `@shared/types`).  
Constants: `CURRENT_MEMBER_ID`, `SEAT_HOLD_TTL_MS` in `@shared/seat-hold`.

### `members` (seeded)

| Field | Notes |
|-------|-------|
| `_id` | e.g. `m1` |
| `display_name` | |

### `seats` (seeded)

| Field | Notes |
|-------|-------|
| `_id` | e.g. `s1` |
| `section` | e.g. `Orchestra` |
| `label` | e.g. `A1` |
| `status` | `open` \| `held` |
| `held_by_id` / `held_by_name` | `null` when open |
| `held_until` | ISO or `null` when open |
| `notes` | |
| `version` | optimistic concurrency for notes |

## API

- `GET /api/seats` → ordered by `section` asc, then `label` asc
  - Query `status` optional; default `all`
  - `all` \| `open` \| `held` (**effective**) → else **`400`**
- `GET /api/seats/summary` → `{ open, held }` (**effective** counts)
- `POST /api/seats/:id/hold` body `{ member_id }`
  - Success → `200` seat (`status: held`, holder fields, `held_until`, bumped `version`)
  - Active hold → **`409`** `{ message, latest }`
  - Missing seat → **`404`**
- `PATCH /api/seats/:id` body `{ member_id, expected_version, notes }`
  - Success only while **your** hold is active and version matches → `200`
  - Hold no longer active → **`410`** `{ message, latest }`
  - Stale version, hold still active → **`412`** `{ message, latest }`
  - Missing seat → **`404`**

## Product

1. Load summary + seats (`status=all`) on first render  
2. Status filter updates the list; summary stays global  
3. **Hold seat** on an available row (`CURRENT_MEMBER_ID = "m1"`)  
4. On **409**, show `conflict-message`  
5. Expand a seat you actively hold → read-only details + **Edit** → notes form + Save  
6. Successful save sends draft `notes` + `expected_version` + `member_id` and reflects bumped version  
7. On **412**, show `stale-message`; on **410**, show `gone-message`  
8. After hold/save attempts, list + summary stay in sync with the API  
9. Rows: section, label, status; holder name when actively held  

## UI hooks

| Hook | |
|------|--|
| `combobox` | Status filter |
| `seat-list` | |
| `{id}-seat-row` | |
| `{id}-seat-section`, `{id}-seat-label`, `{id}-seat-status` | **required** |
| `{id}-seat-holder` | when an active hold has a holder name |
| `button` | Hold seat, Expand, Edit, Save detail changes |
| `{id}-details-view` | read-only after Expand |
| `{id}-details-form` | after Edit |
| `{id}-notes`, `{id}-version` | |
| `summary-open`, `summary-held` | |
| `conflict-message` / `stale-message` / `gone-message` | |

Form appears **only after Edit**, never on Expand alone.

## Claim identity

```ts
import { CURRENT_MEMBER_ID } from "../../shared/seat-hold.ts"; // "m1"
```

## Tasks

See `shared/seat-hold.ts` (`challengeTasks`).

## Workflow

```bash
pnpm challenge seat-hold --prepare
pnpm dev
pnpm test:challenge:watch
```

Solve under `challenges/seat-hold/exercise/`. Do not edit `.solutions/` while practicing.
