# Vite + Express + Postgres Challenges

Isolated practice workspace for realistic fullstack interview drills on **Vite + React + Express + Postgres (`pg`) + Tailwind**.

You implement one challenge at a time under `challenges/<slug>/exercise/`. The same Vitest suite can run against your exercise or against a hidden reference in `.solutions/<slug>/`.

---

## Prerequisites

- Node.js 20+ (this repo is exercised on modern Node; `pnpm` required)
- A running **Postgres** instance you can create a database on
- Familiarity with Express routes, parameterized SQL, and React `fetch`

---

## Quick start (fresh clone)

```bash
cd stacks/vite-express-postgres
cp .env.example .env
# Edit DATABASE_URL if your local Postgres user/password/db differ

pnpm install
pnpm challenge                  # interactive picker
# or: pnpm challenge orders-inbox --prepare

pnpm challenge --prepare        # reset + seed active challenge (if you only selected)
pnpm dev                        # API :4010 + Vite client
```

In a second terminal:

```bash
pnpm test:challenge:watch
```

Open the client URL Vite prints (usually `http://localhost:5173`). The API base is `http://localhost:4010` (`VITE_API_BASE_URL`).

---

## Environment

| Variable | Default (example) | Purpose |
|----------|-------------------|---------|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/practice_fullstack` | Postgres connection string |
| `PORT` | `4010` | Express listen port |
| `VITE_API_BASE_URL` | `http://localhost:4010` | Browser `fetch` origin for the UI |
| `CHALLENGE_VARIANT` | `exercise` (tests set this) | `exercise` → your code; `reference` → `.solutions/` |

Create the database once if it does not exist (example):

```bash
createdb practice_fullstack
# or: psql -c 'CREATE DATABASE practice_fullstack;'
```

All challenges share this database. Switching challenges runs a **full table drop** then recreates only the active challenge’s schema/data.

---

## Selecting a challenge

Active slug lives in `config/active-challenge.json`. Catalog: `config/challenges.ts`.

```bash
pnpm challenge --list
pnpm challenge <slug>             # write active-challenge.json
pnpm challenge <slug> --prepare   # select + db:reset + db:seed
pnpm challenge --prepare          # re-prepare whatever is already active
```

After switching, always re-prepare before relying on seed data:

```bash
pnpm challenge ticket-claim --prepare
pnpm dev
```

### Challenge catalog

| Slug | Title | Spine (short) |
|------|-------|----------------|
| `dispatch-board` | Dispatch Board | Filters + claim + Expand→Edit→versioned PATCH |
| `orders-inbox` | Orders Inbox | List + status filter + summary + Expand (read-only) |
| `product-filter` | Product Filter Desk | POST filter query → list |
| `ticket-claim` | Ticket Claim Desk | List + filter + summary + atomic claim (**409**) |
| `coupon-redeem` | Coupon Redeem Desk | Coupons + summary + redeem + idempotency (**422** paths) |
| `brief-desk` | Brief Desk | Board + claim + Expand→Edit→versioned save |
| `slug-studio` | Slug Studio | Pages + versioned edit + publish/unpublish |
| `pulse-quiz` | Pulse Quiz | Timed quiz loop + attempt summary |
| `leave-desk` | Leave Desk | Leave requests + balance + approve/reject + rich status map |

Per-challenge product contract: `challenges/<slug>/README.md` (outcomes, statuses, fields, UI hooks). **That file is the source of truth while you solve.**

---

## Repository layout

```
stacks/vite-express-postgres/
├── config/
│   ├── challenges.ts            # catalog
│   ├── active-challenge.json    # current slug
│   └── current-challenge.ts     # resolved { slug, title }
├── scripts/
│   └── select-challenge.ts      # pnpm challenge
├── client/                      # Vite shell → loadChallengeApp()
├── server/                      # Express shell → loadChallengeServerModule()
│   ├── create-app.ts
│   ├── db.ts                    # shared pg Pool
│   └── types.ts                 # ChallengeServerModule { app, pool }
├── db/
│   ├── reset.ts                 # DROP all known challenge tables
│   └── seed.ts                  # routes to challenges/<slug>/db/seed.ts
├── challenges/<slug>/
│   ├── README.md                # learner product contract
│   ├── db/seed.ts               # CREATE TABLE + seed rows
│   └── exercise/
│       ├── types.ts             # domain types for this challenge
│       ├── client/              # React UI (you implement)
│       └── server/index.ts      # Express routes (you implement)
├── .solutions/<slug>/           # hidden reference (do not peek while practicing)
│   ├── client/                  # may include api.ts
│   └── server/
├── shared/
│   ├── types.ts                 # barrel re-export of all exercise/types.ts + BASE_URL
│   └── <slug>.ts                # challengeTasks titles (+ helpers)
└── tests/
    ├── api/<slug>.test.ts
    ├── ui/<slug>.test.tsx
    ├── expect-json.ts           # full-object assertion dumps
    └── reporters/challenge-summary.ts
```

### What you edit vs what you don’t

| Path | While practicing |
|------|------------------|
| `challenges/<slug>/exercise/**` | **Implement here** |
| `challenges/<slug>/README.md` | Read only (contract) |
| `challenges/<slug>/exercise/types.ts` | Read / import (don’t invent parallel shapes) |
| `.solutions/` | **Do not edit or copy** during a timed solve |
| `tests/` | Read failures; don’t weaken tests mid-solve |
| `config/active-challenge.json` | Prefer `pnpm challenge` over hand-editing |

---

## Scripts reference

| Script | What it does |
|--------|----------------|
| `pnpm challenge` | Interactive picker / `--list` / `<slug>` / `--prepare` |
| `pnpm db:reset` | Drop every known challenge table |
| `pnpm db:seed` | Seed **active** challenge only |
| `pnpm db:prepare` | `reset` then `seed` |
| `pnpm dev` | Express + Vite together |
| `pnpm dev:server` / `pnpm dev:client` | Split processes |
| `pnpm test:challenge` | Vitest against **exercise** |
| `pnpm test:challenge:watch` | Watch mode (exercise) |
| `pnpm test:solution` | Same tests against **`.solutions/`** (proves the challenge is solvable) |
| `pnpm build` | Vite production build + `tsc --noEmit` |

Recommended layout:

1. Terminal A — `pnpm dev`
2. Terminal B — `pnpm test:challenge:watch`

---

## How loading works

1. `config/active-challenge.json` → `currentChallenge.slug`
2. Server (`server/load-challenge-server.ts`) and client (`client/src/load-challenge-app.tsx`) switch on that slug
3. `CHALLENGE_VARIANT` / `VITE_CHALLENGE_VARIANT`:
   - `exercise` (default) → `challenges/<slug>/exercise/...`
   - `reference` → `.solutions/<slug>/...`

`create-app.ts` mounts `/api/health` then calls:

```ts
await module.registerRoutes({ app, pool });
```

Your server module must export a default `ChallengeServerModule` with `registerRoutes`.

---

## Stack conventions (read before coding)

### Postgres + `pg`

- Use the injected **`pool`** — no second connection pool in exercise code
- Prefer parameterized queries: `pool.query(sql, [params])`
- Schema lives in the challenge seed (`CREATE TABLE IF NOT EXISTS` + seed inserts)
- Reset drops **all** challenge tables so switches stay clean

### JSON shapes = SQL idiom

- Primary keys in API JSON are **`id`**, not Mongo `_id`
- Prefer **TEXT** primary keys that match seed ids (`ord1`, `t1`, `c1`, …) so UI `data-testid`s stay stable
- Column names are snake_case in JSON unless the challenge README says otherwise
- Joined display fields (e.g. `assigned_member_name`) are computed in SQL/`SELECT`, not invented only in the UI

### Types

- Each challenge owns `challenges/<slug>/exercise/types.ts`
- `shared/types.ts` re-exports every challenge’s types + `BASE_URL` (`http://localhost:4010`)
- Import from `@shared`-style paths only if configured; otherwise `../../../shared/types.ts` / local `../types.ts`
- Claim/redeem actors are explicit constants (`CURRENT_AGENT_ID`, `CURRENT_MEMBER_ID`, `CURRENT_USER_ID`) — do not invent another id

### Client HTTP is exercise work

- You write `fetch` (URL, query, body, headers, status branching)
- Do **not** expect an injected `api` prop in tests
- Reference solutions may ship `.solutions/<slug>/client/api.ts` — that is the answer key, not scaffolding

### HTTP statuses

Do not overload one status (especially **409**) for every failure. Prefer distinct codes:

| Status | Typical meaning |
|--------|-----------------|
| **400** | Bad / missing input |
| **403** | Authenticated but not allowed (when in scope) |
| **404** | Missing resource |
| **409** | True conflict with another entity/state (claim taken, unique slug) |
| **412** | Stale optimistic concurrency (`expected_version`) |
| **422** | Well-formed but unprocessable business state (exhausted coupon, bad leave transition) |

Tests assert **status** as the primary contract. UI should branch on status, not message-string matching.

### List / summary source of truth

For board-style challenges: after mutations that can race (claim, redeem, save, …) — success **or** failure — **refetch** list (and summary) from GET. Do not treat a single mutation/`latest` body as the whole list.

Domain events the UI must remember (attempt rows, redemptions, etc.) need one authoritative producer — almost always a complete API payload or a summary GET. See challenge README Architecture tables.

---

## Testing

### API tests

- Real Express app via `createApp()` + **supertest**
- Real Postgres (run `pnpm db:prepare` for the active slug first)
- Often `beforeEach` resets rows for isolation
- Object asserts use `tests/expect-json.ts` so failures dump **full** `actual` / `expected` (+ `DIFF` when applicable)

### UI tests

- jsdom + Testing Library
- Network stubbed at **`fetch`** (see `tests/ui/mock-fetch.ts`)
- Prefer accessible roles (`getByRole`) over brittle label wiring; `data-testid` for non-interactive tiles

### Failure output

Challenge reporter prints full failure detail (no truncated diffs). If a dump looks like escaped `Object {\n...}`, that is a tooling bug — full JSON dumps are intentional.

### Running one challenge’s tests

Vitest includes all `tests/**/*.test.*`. With the active slug selected, unrelated suites may still load; prefer having prepared the DB for the challenge you care about, and filter by name when iterating:

```bash
pnpm test:challenge -- tests/api/orders-inbox.test.ts
pnpm test:challenge -- -t "redeems an active coupon"
```

(`vitest run` args after `--`.)

### Proving a challenge is solvable

```bash
pnpm challenge <slug> --prepare
pnpm test:solution
```

Must be green before a challenge is considered shippable.

---

## Solving workflow (suggested)

1. `pnpm challenge <slug> --prepare`
2. Read `challenges/<slug>/README.md` top to bottom — especially the **outcome → status → body** table
3. Skim `exercise/types.ts` and seed ids
4. Implement **server routes** until API tests go green
5. Implement **UI** (`fetch`, filters, conflict/unprocessable branches, hooks) until UI tests go green
6. Keep `pnpm test:challenge:watch` open; fix from the summary reporter
7. When stuck on SQL races: atomic `UPDATE … WHERE …` / unique constraints + insert/catch — avoid “clever” upserts that encode business rules in `$ne`-style filters

---

## Authoring / porting notes (maintainers)

When adding or porting a challenge into this stack:

1. Add catalog entry in `config/challenges.ts`
2. Wire slug in **both** loaders (`server/load-challenge-server.ts`, `client/src/load-challenge-app.tsx`)
3. Add `challenges/<slug>/db/seed.ts` and list new tables in `db/reset.ts`
4. Add `exercise/types.ts`, stubs, README, `.solutions/`, `shared/<slug>.ts`, API + UI tests
5. Re-export types from `shared/types.ts`
6. `pnpm challenge <slug> --prepare && pnpm test:solution` must pass
7. Learner README = **product contract only** (no authoring lectures about upsert/refetch sermons)

Porting from the MERN stack: remap `_id` → `id`, `db` → `pool`, collections → SQL tables, Mongo operators → parameterized SQL. Keep task titles aligned with tests.

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| API tests: “Expected seeded …” / empty tables | `pnpm challenge <slug> --prepare` |
| UI talks to wrong host | Check `VITE_API_BASE_URL` and that `pnpm dev` API is on **4010** |
| Routes from another challenge | Wrong `active-challenge.json` — re-run `pnpm challenge <slug>` and restart `pnpm dev` |
| `ECONNREFUSED` Postgres | Postgres not running or bad `DATABASE_URL` |
| `role "postgres" does not exist` | Homebrew macOS has no `postgres` role — set `DATABASE_URL=postgres://$(whoami)@localhost:5432/practice_fullstack` in `.env`, then `createdb practice_fullstack` if needed |
| Stale schema after switching challenges | `pnpm db:prepare` (reset drops all known tables) |
| `tsc` / import errors on types | Ensure `challenges/<slug>/exercise/types.ts` exists and is exported from `shared/types.ts` |

---

## Related

- Sibling Mongo stack: `stacks/mern/`
- Workspace authoring rules: `.cursor/rules/challenge-*.mdc` (HTTP statuses, domain SoT, exercise boundaries, test DX)
