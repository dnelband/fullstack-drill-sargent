import type { ComponentType } from "react";

export interface SeatHoldChallengeModule {
  ChallengeApp: ComponentType;
}

/** Acting buyer for hold UI — do not invent another id. */
export const CURRENT_MEMBER_ID = "m1";

/** Soft-hold duration applied on successful POST …/hold (server clock). */
export const SEAT_HOLD_TTL_MS = 60_000;

export const challengeTasks = [
  "[API] GET /api/seats filters by effective status (expired holds count as open)",
  "[API] GET /api/seats returns 400 for an invalid status",
  "[API] GET /api/seats/summary counts expired holds as open",
  "[API] POST /api/seats/:id/hold holds an available seat",
  "[API] POST /api/seats/:id/hold returns 409 with latest when actively held",
  "[API] Concurrent hold requests allow exactly one winner for the same seat",
  "[API] PATCH /api/seats/:id updates notes when the hold is active and version matches",
  "[API] PATCH /api/seats/:id returns 412 with latest when the version is stale",
  "[API] PATCH /api/seats/:id returns 410 with latest when the hold expired",
  "[UI] The seat list, summary, and status filter load on first render",
  "[UI] Status filter updates the list",
  "[UI] Holding a seat updates the row and summary",
  "[UI] A lost hold shows conflict-message and refetches the list",
  "[UI] Expanding a held seat, editing notes, and saving reflects the draft",
  "[UI] A stale save shows stale-message",
  "[UI] An expired-hold save shows gone-message",
] as const;
