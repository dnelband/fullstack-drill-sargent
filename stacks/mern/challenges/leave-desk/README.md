# Leave Desk

Build a tiny **leave desk**: employees request leave, managers approve or reject, balances update on approve, and overlapping dates conflict.

## Architecture (source of truth)

Mutations return a **complete `LeaveRequest`** on success (`200`). Status codes are case-specific — do **not** blanket everything as `409`. The UI must not invent leave fields from message-only errors.

| Outcome | Status | Body |
|---------|--------|------|
| List / create / patch / approve / reject success | `200` | full `LeaveRequest` (balance GET is its own record) |
| Invalid / missing body fields, bad dates, bad type | **`400` Bad Request** | `{ message }` |
| `reviewer_id` is not a manager | `403` | `{ message }` |
| Missing user / request | `404` | `{ message }` |
| Overlapping dates (create / patch) | **`409` Conflict** | `{ message, conflicting_request }` |
| Stale `expected_version` (patch / approve / reject race) | **`412` Precondition Failed** | `{ message, latest }` |
| Wrong state (PATCH when not pending; approve/reject already decided) | **`422` Unprocessable Entity** | `{ message, latest }` |
| Insufficient balance on approve | **`422`** | `{ message: "Insufficient leave balance.", latest }` |

**Why 409 vs 412 vs 422:** `409` is a true resource conflict (another leave already occupies those dates). `412` is optimistic-concurrency failure (`expected_version` does not match). `422` is a business / state-machine failure (already decided, not pending, or not enough balance).

**Bad Request is `400`, not `401`.** Malformed bodies and invalid dates are client errors on the payload — there is no auth challenge in this desk, so do not invent `401 Unauthorized`.

**Overlap:** same `user_id`, against requests with `status` in `pending` \| `approved`, inclusive date ranges.

**Balance:** approve of `annual` / `sick` deducts `days` from that bucket. `unpaid` does not change balances. Create/edit of pending does **not** reserve balance.

**Version:** every successful PATCH / approve / reject increments `version`. Filters must be atomic: `{ _id, version: expected_version }` (approve/reject also constrain `status: pending`).

## Stack notes

- Native MongoDB driver (no Mongoose)
- Keep `_id` in JSON
- Express + React (Vite) + Tailwind
- No JWT — use the **Acting as** combobox with seeded users

## Domain

### `users` (seeded)

| Field | Notes |
|-------|-------|
| `_id` | e.g. `u1` |
| `display_name` | |
| `role` | `employee` \| `manager` |

### `leave_balances` (seeded)

| Field | Notes |
|-------|-------|
| `_id` | e.g. `bal-u1` |
| `user_id` | |
| `annual_days` | remaining |
| `sick_days` | remaining |

Users with no `leave_balances` row still get **`200`** with `annual_days: 0` and `sick_days: 0`. **`404` only if the user is missing.**

### `leave_requests` (seeded)

| Field | Notes |
|-------|-------|
| `_id` | e.g. `lr1` |
| `user_id` / `user_name` | |
| `type` | `annual` \| `sick` \| `unpaid` |
| `status` | `pending` \| `approved` \| `rejected` |
| `start_date` / `end_date` | `YYYY-MM-DD` |
| `days` | inclusive calendar days |
| `notes` | |
| `version` | optimistic concurrency |
| `updated_at` | ISO |
| `reviewed_by_id` / `reviewed_at` | null until decided |

## API

- `GET /api/users` → users ordered by `display_name`
- `GET /api/leave-balance?user_id=` → balance (`200`); missing user → `404`; no balance row → `200` with zeros
- `GET /api/leave-requests` → filters: `status` (default `all`), `type`, `user_id`; order `start_date` asc then `_id`
- `POST /api/leave-requests` body `{ user_id, type, start_date, end_date, notes }`
  - `200` pending request
  - Invalid body / dates → `400`
  - Overlap → `409` `{ message: "Leave dates overlap an existing request.", conflicting_request }`
- `PATCH /api/leave-requests/:id` body `{ expected_version, type, start_date, end_date, notes }`
  - Pending only; bumps `version`
  - Invalid body / dates / missing `expected_version` → `400`
  - Not pending → `422` `{ message, latest }`
  - Stale `expected_version` → `412` `{ message, latest }`
  - Overlap → `409` `{ message, conflicting_request }`
- `POST /api/leave-requests/:id/approve` body `{ expected_version, reviewer_id }`
  - Manager `reviewer_id`; deduct balance for annual/sick; bump `version`
  - Invalid body → `400`; non-manager reviewer → `403`
  - Already decided → `422` + `latest`
  - Stale `expected_version` → `412` + `latest`
  - Insufficient balance → `422` `{ message: "Insufficient leave balance.", latest }`
- `POST /api/leave-requests/:id/reject` body `{ expected_version, reviewer_id }`
  - Same concurrency / state rules as approve; does not change balances

## Product

1. Load users, balance (for acting user), and leave list on first render  
2. **Acting as** switches actor → reload balance + list (employees filter `user_id`; managers see all)  
3. Employee: submit leave form; Expand → read-only details + **Edit** → one form (type/dates/notes) + Save  
4. Manager: Expand → Edit → **Approve leave** / **Reject leave** on that same form  
5. Successful save/approve must reflect draft body / updated status + balance from API responses  
6. Handle conflicts: show `message` for `409` / `412` / `422`; apply `latest` when present  

Default actor for exercise wiring:

```ts
const CURRENT_USER_ID = "u1";
```

## UI hooks

| Hook | |
|------|--|
| `combobox` | Acting as, Status filter, Type filter |
| **New leave form** (employee) | `data-testid="leave-request-form"` — visible when acting as an employee |
| `combobox` name **Type** | create-form leave type (`/^type$/i` — not "Type filter") |
| `textbox` / date | **Start date**, **End date**, **Notes** |
| `button` | Submit leave request |
| `leave-list` | |
| `{id}-leave-row` | |
| `{id}-leave-user-name`, `{id}-leave-type`, `{id}-leave-status`, `{id}-leave-dates`, `{id}-leave-days`, `{id}-leave-version` | list tiles |
| `balance-annual`, `balance-sick` | |
| `summary-pending` | count of pending in the loaded list |
| `button` | Expand, Edit, Save detail changes, Approve leave, Reject leave |
| `{id}-details-view` | read-only after Expand |
| `{id}-details-form` | form after **Edit** only |
| `{id}-type`, `{id}-start-date`, `{id}-end-date`, `{id}-notes` | draft fields on the Edit form |
| `conflict-message` | |

**Form on Edit.** Expand never opens the details form. Approve/Reject live on that same form — not on the read-only expand panel.

**Create vs Edit:** the employee **new leave** form is always on the page (when acting as employee). The `{id}-details-form` appears only after Expand → Edit.

## Difficulty

Intrinsic **Hard** / live **Hardcore** / take-home **Medium–Hard**.

## Tasks

See `shared/leave-desk.ts`.

## Workflow

```bash
cp .env.example .env
pnpm install && pnpm db:prepare && pnpm dev
pnpm test:challenge:watch
```

Solve only under `challenges/leave-desk/exercise/`.
