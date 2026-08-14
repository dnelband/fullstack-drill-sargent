# Memo Desk

Build a **memo desk**: list memos, filter by status, edit your active memo body with optimistic concurrency, and archive when done.

## Live budget

Intrinsic **Hard** / live **~50–60m** / take-home **Medium**.  
**12 tests.** Owner-scoped PATCH · archive **410** · stale **412**.

## Architecture (source of truth)

| Outcome | Status | Body |
|---------|--------|------|
| List / summary / patch / archive success | `200` | `MemoRecord[]` / `MemoSummary` / `MemoRecord` |
| Invalid `status` query, bad body, unknown `owner_id` | **`400`** | `{ message }` |
| `owner_id` is not the memo owner | **`403`** | `{ message }` |
| Memo not found | **`404`** | `{ message }` |
| Patch or archive when memo is **archived** | **`410`** | `{ message, latest }` |
| Stale `expected_version` while memo is still **active** | **`412`** | `{ message, latest }` |

### Write rules

- PATCH and archive succeed only while `status === "active"`, `owner_id` matches the body, and `version` matches `expected_version` (atomic filter).
- On miss, diagnose in order: missing → **404**; wrong owner → **403**; **archived → 410**; version mismatch → **412**.
- An archived memo with a stale `expected_version` is still **410** (not 412).

**Summary** is global.

## Stack notes

- Native MongoDB driver (no Mongoose)
- Keep `_id` in JSON
- Express + React (Vite) + Tailwind

## Domain

Types: `exercise/types.ts` (also via `@shared/types`).  
Constant: `CURRENT_OWNER_ID` in `@shared/memo-desk`.

### `members`

| Field | Notes |
|-------|-------|
| `_id` | e.g. `m1` |
| `display_name` | |

### `memos`

| Field | Notes |
|-------|-------|
| `_id` | e.g. `n1` |
| `title` | |
| `body` | |
| `status` | `active` \| `archived` |
| `owner_id` / `owner_name` | |
| `version` | optimistic concurrency |
| `updated_at` | ISO |

## API

- `GET /api/memos` → ordered by `updated_at` desc
  - Query `status` optional; default `all`
  - `all` \| `active` \| `archived` → else **`400`**
- `GET /api/memos/summary` → `{ active, archived }`
- `PATCH /api/memos/:id` body `{ owner_id, expected_version, body }`
  - Success → `200` memo (bumped `version`, new `body`, new `updated_at`)
- `POST /api/memos/:id/archive` body `{ owner_id, expected_version }`
  - Success → `200` memo (`status: archived`, bumped `version`)

## Product

1. Load summary + memos (`status=all`) on first render  
2. Status filter updates the list; summary stays global  
3. Expand → read-only details; **Edit** on **your active** memos → body form + Save  
4. **Archive memo** on your active rows  
5. Mutations send `CURRENT_OWNER_ID` + `expected_version` (+ draft `body` on save)  
6. On **412** → `stale-message`; on **410** → `gone-message`  
7. After patch/archive attempts, list + summary stay in sync with the API  

## UI hooks

| Hook | |
|------|--|
| `combobox` | Status filter |
| `memo-list` | |
| `{id}-memo-row` | |
| `{id}-memo-title`, `{id}-memo-status` | **required** |
| `button` | Expand, Edit, Save detail changes, Archive memo |
| `{id}-details-view` | read-only after Expand |
| `{id}-details-form` | after Edit |
| `{id}-body`, `{id}-version` | |
| `summary-active`, `summary-archived` | |
| `stale-message` / `gone-message` | |

Form appears **only after Edit**, never on Expand alone.

## Claim identity

```ts
import { CURRENT_OWNER_ID } from "../../shared/memo-desk.ts"; // "m1"
```

## Tasks

See `shared/memo-desk.ts` (`challengeTasks`).

## Workflow

```bash
pnpm challenge memo-desk --prepare
pnpm test:challenge
```
