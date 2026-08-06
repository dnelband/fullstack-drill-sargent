# Dispatch Board

You are building a dispatch board used by a callback operations team. Agents pick up customer callbacks, add notes, and close work from a single screen.

The codebase already includes:

- a Vite client with Tailwind
- an Express API server
- local Postgres setup and seed scripts
- a hidden validated solution
- challenge tests for each required task

You are expected to complete the exercise version only:

- `challenges/dispatch-board/exercise/server/`
- `challenges/dispatch-board/exercise/client/`

That includes writing the client HTTP layer yourself (`fetch`, query params, request bodies, error/conflict handling). The app shell does not provide an API client for you.

Do not work inside `.solutions/` during practice.

## Available Tables

The seeded database for this challenge contains exactly these tables:

### `agents`

Use this table for the people who can claim callbacks.

- `id`
- `display_name`
- `team`

### `callbacks`

Use this table for the actual work items shown in the board and detail panel.

- `id`
- `customer_name`
- `topic`
- `priority`
- `status`
- `assigned_agent_id`
- `scheduled_for`
- `notes`
- `version`
- `updated_at`

`callbacks.assigned_agent_id` references `agents.id`.

## API Response Shapes

These shapes are fixed. Field names match the database columns.

### `GET /api/agents` → array

```json
[
  { "id": "a1", "display_name": "Nina Patel", "team": "Ops" }
]
```

### `GET /api/callbacks` → array

Same pattern as agents: the body is the array of callbacks.

Default behavior with no query params: only `status = 'open'`.

Supported query params:
- `status`
- `assigned_agent_id`
- `search` (matches `customer_name` or `topic`)

Results are ordered by priority (`high`, then `medium`, then `low`), then by `scheduled_for` ascending.
```json
[
  {
    "id": 1,
    "customer_name": "Acme Logistics",
    "topic": "Invoice mismatch",
    "priority": "high",
    "status": "open",
    "assigned_agent_id": null,
    "assigned_agent_name": null,
    "scheduled_for": "2026-08-04T08:00:00.000Z",
    "notes": "...",
    "version": 1,
    "updated_at": "2026-08-04T08:00:00.000Z"
  }
]
```

`assigned_agent_name` comes from joining `agents` when `assigned_agent_id` is set.

Board totals are **not** included here. Use `GET /api/summary` for that.

### `GET /api/summary` → object

```json
{ "open": 17, "claimed": 4, "completed": 3 }
```

### Claim / update success → single callback object

Same fields as one element of the callbacks array above.

### Claim / update conflict → `409`

```json
{
  "message": "Your copy is stale. Refresh with the latest callback data.",
  "latest": {
    "id": 1,
    "customer_name": "Acme Logistics",
    "topic": "Invoice mismatch",
    "priority": "high",
    "status": "completed",
    "assigned_agent_id": "a1",
    "assigned_agent_name": "Nina Patel",
    "scheduled_for": "2026-08-04T08:00:00.000Z",
    "notes": "First save wins.",
    "version": 3,
    "updated_at": "2026-08-04T10:00:00.000Z"
  }
}
```

`latest` is required on stale update conflicts. It is the current callback row from the server (same shape as a successful claim/patch body), so the UI can replace its stale copy.

## Product Requirements

- Show the seeded agents and callbacks.
- Load a callback list and summary on first render.
- Support filtering by status, assignee, and free-text search.
- Allow an agent to claim an open callback.
- Allow notes and status updates from the expanded callback details form.
- Protect against stale writes with optimistic concurrency (`expected_version`). Successful claim and patch responses must increment `version`.
- Surface server conflicts clearly in the UI.

## Constraints

- Use the existing database tables and keep seeds under 30 rows.
- Keep log output low-noise.
- Keep the API and UI testable. UI tests mock `fetch` at the network layer; do not rely on an injected fake API prop.
- UI tests query by role + accessible name first (`combobox` / `textbox` / `button`). Use `data-testid` for summary tiles and callback list field hooks. `aria-label` or a correctly associated `<label>` both work.
- The challenge must work entirely from VS Code terminals.
- API request and response JSON use the same field names as the database columns. Do not rename to camelCase.

## UI layout

Callback details are **inline expand/collapse** on each list row — not a separate detail pane.

Expand/collapse with a **dedicated button** inside each `{id}-callback-row`. The button's accessible name is **Expand** (use `aria-expanded` for open/closed). Query it within that row. Do not expand by clicking the customer name or the whole row header.

After expanding, show **read-only details first** plus an **Edit** button. Only after clicking **Edit** should the editable form appear.

## UI accessible names

Filter and action controls use role + accessible name:

| Role | Accessible name |
|------|-----------------|
| `combobox` | Status filter, Assignee filter |
| `textbox` | Search filter, `{id}-notes` |
| `button` | Expand (within `{id}-callback-row`), Edit (within `{id}-callback-row`), Claim callback, Save detail changes |

Summary tiles use `data-testid`: `summary-open`, `summary-claimed`, `summary-completed`.

Wrap the callback list in `data-testid="callback-list"`. Each row field includes the callback id:

| `data-testid` | Value |
|---------------|-------|
| `{id}-callback-row` | row container; scope for the Expand button |
| `{id}-callback-customer-name` | `customer_name` |
| `{id}-callback-topic` | `topic` |
| `{id}-callback-priority` | `priority` |
| `{id}-callback-status` | `status` (just the status value, e.g. `open`) |
| `{id}-callback-assignee` | `assigned_agent_name` or `Unassigned` |
| `{id}-details-view` | read-only details container after expand |
| `{id}-details-form` | edit form container shown only after clicking Edit |
| `{id}-notes` | notes textarea inside the edit form (also the textbox accessible name) |
| `{id}-details-status` | details status select inside the edit form |
| `{id}-version` | current `version` shown in expanded details and while editing |

## Claim identity

This challenge is **not** about discovering who the acting user is.

Use a fixed current agent id in the exercise UI, for example:

```ts
const CURRENT_AGENT_ID = "a1";
```

Fetch `GET /api/agents` for filter options and UI display, not to figure out which agent id should be sent by the claim action.

## Curveballs

- Two agents may try to claim the same callback at the same time.
- A details form may submit an outdated `expected_version`.
- The UI should show the latest server snapshot after a conflict.

## Tasks

1. `[API] GET /api/agents returns all seeded agents ordered by display_name`
2. `[API] GET /api/callbacks defaults to status open when no status query is provided`
3. `[API] GET /api/callbacks orders results by priority then scheduled_for`
4. `[API] GET /api/callbacks filters by status, assignee, and search text`
5. `[API] POST /api/callbacks/:id/claim assigns an open callback and increments its version`
6. `[API] POST /api/callbacks/:id/claim rejects a second claim for the same callback`
7. `[API] Concurrent claim requests allow exactly one winner for the same callback`
8. `[API] PATCH /api/callbacks/:id updates notes and status and increments version when the expected version matches`
9. `[API] PATCH /api/callbacks/:id returns 409 with message and latest callback when a stale version is submitted`
10. `[UI] First render shows summary counts`
11. `[UI] First render shows the initial callback list`
12. `[UI] The callback list shows callback details (customer name, topic, priority, status, assignee) from the API response`
13. `[UI] Status filter is available`
14. `[UI] Search filter is available`
15. `[UI] Assignee filter is available`
16. `[UI] Assignee filter lists agents from the API`
17. `[UI] Status filter changes the visible callbacks`
18. `[UI] Assignee filter changes the visible callbacks`
19. `[UI] Search filter changes the visible callbacks`
20. `[UI] Claiming a callback updates summary and shows assignee under the claimed filter`
21. `[UI] Expanding a callback shows read-only details and an Edit button`
22. `[UI] Clicking Edit shows the details form (notes, details status, save)`
23. `[UI] The details form starts with notes and version from the selected callback`
24. `[UI] A 409 save shows the server message and latest notes/version`
25. `[UI] Detail controls are disabled while a save is pending`

## Suggested Workflow

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to your local Postgres instance.
3. Run `pnpm install`.
4. Run `pnpm db:prepare` once to create and seed the tables.
5. Start the app with `pnpm dev`.
6. In another terminal run `pnpm test:challenge:watch`.

The challenge tests do **not** seed the database. They expect `agents` and `callbacks` to already exist from `pnpm db:prepare`. Claim/update tests mutate rows, so if the suite starts failing after you have already claimed or patched callbacks, run `pnpm db:prepare` again to restore the original seed.
