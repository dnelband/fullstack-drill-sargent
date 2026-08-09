import type { ComponentType } from "react";

export interface SlugStudioChallengeModule {
  ChallengeApp: ComponentType;
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 48;

export const challengeTasks = [
  "[API] GET /api/pages returns seeded pages ordered by updated_at desc",
  "[API] GET /api/pages/:id returns a page or 404",
  "[API] PATCH /api/pages/:id persists title and body and bumps version",
  "[API] PATCH /api/pages/:id returns 409 with latest when expected_version is stale",
  "[API] POST /api/pages/:id/publish publishes with a slug and bumps version",
  "[API] POST /api/pages/:id/publish returns 409 with conflicting_page when the slug is taken",
  "[API] POST /api/pages/:id/publish returns 409 with latest when expected_version is stale",
  "[API] POST /api/pages/:id/unpublish returns the page to draft and clears published_at",
  "[API] GET /api/public/:slug returns a published page",
  "[API] GET /api/public/:slug returns 404 for a draft slug",
  "[UI] The page list loads on first render",
  "[UI] Expanding a page shows read-only details and an Edit button",
  "[UI] Clicking Edit shows the details form (title, body, publish slug, save)",
  "[UI] A successful save sends draft title and body and reflects the new version",
  "[UI] A stale save shows the conflict message and applies latest",
  "[UI] Publishing updates status, slug, and the public preview",
  "[UI] A taken slug shows the conflict message",
] as const;
