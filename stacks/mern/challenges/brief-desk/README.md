# Brief Desk

You are building an intake desk for a digital agency. Client briefs arrive all day — homepage tweaks, accessibility fixes, campaign copy. Studio members claim work, leave notes, and close briefs from one screen.

## Stack notes

- MongoDB via the **official Node driver** (no Mongoose)
- Express API + React (Vite) + Tailwind
- Field names in JSON match document fields (`client_name`, `assigned_member_id`, snake_case)

## Domain

### `members`

| Field | Notes |
|-------|-------|
| `_id` | string id (e.g. `m1`) — keep as `_id` in JSON |
| `display_name` | |
| `discipline` | Engineering / Design / Content |

### `briefs`

| Field | Notes |
|-------|-------|
| `_id` | string id (e.g. `b1`) — keep as `_id` in JSON |
| `client_name` | |
| `title` | |
| `priority` | `high` \| `medium` \| `low` |
| `status` | `open` \| `claimed` \| `completed` |
| `assigned_member_id` | null when open |
| `assigned_member_name` | joined for API responses |
| `due_at` | ISO timestamp |
| `notes` | |
| `version` | optimistic concurrency |
| `updated_at` | ISO timestamp |

## API

- `GET /api/members` → members ordered by `display_name`
- `GET /api/summary` → `{ open, claimed, completed }`
- `GET /api/briefs` → defaults `status=open`; filters: `status`, `assigned_member_id`, `search` (client_name or title, case-insensitive); order by priority then `due_at`
- `POST /api/briefs/:id/claim` body `{ member_id }` → claimed brief or `409` `{ message: "Brief is no longer open." }`
- `PATCH /api/briefs/:id` body `{ expected_version, status, notes }` → updated brief or `409` `{ message, latest }`

Successful claim/patch must increment `version`.

## Product requirements

- Load members, brief list, and summary on first render
- Filter by status, assignee, search
- Claim an open brief (acting user is fixed — see below)
- Expand → read-only details + **Edit** → details form
- Successful save must send the draft notes/status and reflect the updated brief (including bumped version)
- Handle stale saves with `message` + apply `latest`

## UI contract

Inline expand/collapse per row (not a separate pane).

| Role | Accessible name |
|------|-----------------|
| `combobox` | Status filter, Assignee filter |
| `textbox` | Search filter, `{id}-notes` |
| `button` | Expand (within `{id}-brief-row`), Edit (within row), Claim brief, Save detail changes |

Summary: `summary-open`, `summary-claimed`, `summary-completed`  
List: `brief-list`  
Row hooks: `{id}-brief-row`, `{id}-brief-client-name`, `{id}-brief-title`, `{id}-brief-priority`, `{id}-brief-status`, `{id}-brief-assignee`  
Details: `{id}-details-view`, `{id}-details-form`, `{id}-details-status`, `{id}-notes`, `{id}-version`

After expand: read-only details **and** an Edit button. Form only after Edit.

## Claim identity

```ts
const CURRENT_MEMBER_ID = "m1";
```

## Difficulty

- Intrinsic: **Hard**
- Live ~45m: **Hardcore**
- Take-home ~4h: **Medium / Hard**

## Tasks

See `shared/brief-desk.ts` (`challengeTasks`) — mirrored in the Vitest suite.

## Workflow

1. Copy `.env.example` → `.env` (defaults talk to local Mongo)
2. `pnpm install`
3. `pnpm db:prepare`
4. `pnpm dev`
5. `pnpm test:challenge:watch`

Do not work inside `.solutions/` during practice.
