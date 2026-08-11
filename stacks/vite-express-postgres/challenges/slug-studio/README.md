# Slug Publish Studio

Build a tiny **page studio**: draft marketing pages, versioned saves, **publish** with a unique slug, **unpublish**, and preview the public URL.

## Architecture (source of truth)

Mutations return a **complete `PageRecord`** on success (`200`). Conflicts return **`409` with `latest`** (full page). Slug collisions also include **`conflicting_page`** (`id`, `title`, `slug`, `status`). The UI must not invent page fields from message-only errors.

| Outcome | Status | Body |
|---------|--------|------|
| List / get / patch / publish / unpublish success | `200` | full `PageRecord` (public GET is a smaller public shape) |
| Stale version or wrong state | `409` | `{ message, latest }` |
| Slug already taken | `409` | `{ message, latest, conflicting_page }` |
| Missing page / unpublished public slug | `404` | |

**Slug uniqueness:** among all pages where `slug != null`. A page may keep its slug after unpublish and republish the same slug.

**Version:** every successful PATCH / publish / unpublish increments `version`. Filters must be atomic: `{ id, version: expected_version }` (publish/unpublish also constrain `status` as documented).

## Stack notes

- Native Postgres driver (no Postgresose)
- Keep `id` in JSON
- Express + React (Vite) + Tailwind

## Domain

### `pages` (seeded)

| Field | Notes |
|-------|-------|
| `id` | e.g. `p1` |
| `title` | |
| `body` | plain text |
| `slug` | `string \| null`; unique when non-null |
| `status` | `draft` \| `published` |
| `version` | optimistic concurrency |
| `updated_at` | ISO |
| `published_at` | ISO \| null |

## API

- `GET /api/pages` → pages ordered by `updated_at` **desc**
- `GET /api/pages/:id` → page or `404`
- `PATCH /api/pages/:id` body `{ expected_version, title, body }`
  - Does **not** change `status` / `slug`
  - `200` updated page
  - `409` `{ message: "Page was updated elsewhere.", latest }`
- `POST /api/pages/:id/publish` body `{ expected_version, slug }`
  - Slug: lowercase kebab `^[a-z0-9]+(?:-[a-z0-9]+)*$`, length **3–48**
  - Another page owns slug → `409` `{ message: "Slug already taken.", latest, conflicting_page }`
  - Stale version → `409` `{ message: "Page was updated elsewhere.", latest }`
  - Success → `status: published`, set `slug` + `published_at`, bump `version`
- `POST /api/pages/:id/unpublish` body `{ expected_version }`
  - Only when `status: published` + matching version → `draft`, keep `slug`, `published_at: null`, bump `version`
  - Otherwise `409` + `latest`
- `GET /api/public/:slug` → `200` `{ title, body, slug, published_at }` if published; else `404`

## Product

1. Load page list on first render  
2. Expand → read-only details + **Edit** (form is **not** visible yet)  
3. Edit → **one** form: `title`, `body`, `publish-slug`, Save, Publish (+ Unpublish when published)  
4. **Save detail changes** sends draft title/body + `expected_version`; UI reflects `200` (or apply `latest` on 409)  
5. After publish, load **public preview** via `GET /api/public/:slug`

## UI hooks

| Hook | |
|------|--|
| `page-list` | |
| `{id}-page-row` | |
| `{id}-page-title`, `{id}-page-status`, `{id}-page-slug`, `{id}-page-version` | list tiles |
| `button` | Expand, Edit, Save detail changes, Publish, Unpublish |
| `{id}-details-view` | read-only panel after Expand |
| `{id}-details-form` | form after **Edit** only |
| `{id}-title`, `{id}-body`, `publish-slug` | fields in that form |
| `public-preview` | |
| `conflict-message` | server conflict text |

**Form on Edit.** Expand never opens the form. Save + Publish live on that same form — do not put publish controls on the read-only expand panel.

## Difficulty

Intrinsic **Hard** / live **Hardcore** / take-home **Medium–Hard**.

## Tasks

See `shared/slug-studio.ts`.

## Workflow

```bash
cp .env.example .env
pnpm install && pnpm db:prepare && pnpm dev
pnpm test:challenge:watch
```

Solve only under `challenges/slug-studio/exercise/`.
