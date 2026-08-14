import type { ComponentType } from "react";

export interface MemoDeskChallengeModule {
  ChallengeApp: ComponentType;
}

/** Acting owner for memo UI — do not invent another id. */
export const CURRENT_OWNER_ID = "m1";

export const challengeTasks = [
  "[API] GET /api/memos filters by status",
  "[API] GET /api/memos returns 400 for an invalid status",
  "[API] GET /api/memos/summary counts by status",
  "[API] PATCH /api/memos/:id updates body when owner and version match",
  "[API] PATCH returns 412 with latest when the version is stale",
  "[API] PATCH returns 410 with latest when archived (even if version is stale)",
  "[API] PATCH returns 403 when owner_id is not the memo owner",
  "[API] POST /api/memos/:id/archive archives an active memo",
  "[UI] The memo list, summary, and status filter load on first render",
  "[UI] Expanding a memo, editing body, and saving reflects the draft",
  "[UI] A stale save shows stale-message",
  "[UI] Archiving a memo updates the row and summary",
] as const;
