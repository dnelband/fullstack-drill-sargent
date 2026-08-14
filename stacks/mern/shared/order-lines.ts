import type { ComponentType } from "react";

export interface OrderLinesChallengeModule {
  ChallengeApp: ComponentType;
}

/** Acting owner for draft-order UI — do not invent another id. */
export const CURRENT_OWNER_ID = "m1";

export const challengeTasks = [
  "[API] GET /api/orders filters by status",
  "[API] GET /api/orders returns 400 for an invalid status",
  "[API] GET /api/orders/summary counts by status",
  "[API] POST /api/orders/:id/lines adds a line on a draft order",
  "[API] POST /api/orders/:id/lines returns 409 when the product is already on the order",
  "[API] Concurrent line adds with the same expected_version allow exactly one winner",
  "[API] PATCH /api/orders/:id/lines/:lineId updates quantity when version matches",
  "[API] PATCH returns 412 with latest when the version is stale",
  "[API] PATCH returns 422 with latest when the order is submitted",
  "[API] PATCH returns 410 with latest when the order is cancelled (even if version is stale)",
  "[API] PATCH returns 403 when owner_id is not the order owner",
  "[API] POST /api/orders/:id/submit submits a draft order",
  "[UI] The order list, summary, and status filter load on first render",
  "[UI] Status filter updates the list",
  "[UI] Expanding a draft, adding a line, and saving reflects the draft",
  "[UI] A duplicate line shows conflict-message",
  "[UI] A stale save shows stale-message",
  "[UI] A locked (submitted) save shows locked-message",
  "[UI] Submitting an order updates the row and summary",
] as const;
