import type { ComponentType } from "react";

export interface HoldQueueChallengeModule {
  ChallengeApp: ComponentType;
}

/** Acting agent for hold UI — do not invent another id. */
export const CURRENT_MEMBER_ID = "m1";

/** Soft-hold duration applied on successful POST …/hold (server clock). */
export const HOLD_TTL_MS = 60_000;

export const challengeTasks = [
  "[API] GET /api/queue returns items ordered by created_at desc",
  "[API] GET /api/queue filters by effective status",
  "[API] GET /api/queue returns 400 for an invalid status",
  "[API] GET /api/queue/summary returns open and held counts",
  "[API] POST /api/queue/:id/hold holds an available item",
  "[API] POST /api/queue/:id/hold returns 409 with latest when actively held",
  "[API] POST /api/queue/:id/hold succeeds when the previous hold expired",
  "[API] PATCH /api/queue/:id updates notes when the hold is active and version matches",
  "[API] PATCH /api/queue/:id returns 412 with latest when the version is stale",
  "[API] PATCH /api/queue/:id returns 410 with latest when the hold expired",
  "[UI] The queue list and summary load on first render",
  "[UI] Holding an item updates the row and summary",
  "[UI] A lost hold shows the conflict message and refetches the list",
  "[UI] Expanding a held item, editing notes, and saving reflects the draft",
] as const;
