import type { ComponentType } from "react";

export interface LeaveDeskChallengeModule {
  ChallengeApp: ComponentType;
}

/** Acting user for leave UI — do not invent another id. */
export const CURRENT_USER_ID = "u1";

/** Inclusive calendar days between YYYY-MM-DD dates (UTC date parts). */
export function inclusiveLeaveDays(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return 0;
  }
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA <= endB && startB <= endA;
}

export const challengeTasks = [
  "[API] GET /api/users returns seeded users ordered by display_name",
  "[API] GET /api/leave-balance returns the balance for a user",
  "[API] GET /api/leave-requests returns requests ordered by start_date then _id",
  "[API] GET /api/leave-requests filters by status and user_id",
  "[API] POST /api/leave-requests creates a pending request",
  "[API] POST /api/leave-requests returns 400 for invalid body or dates",
  "[API] POST /api/leave-requests returns 409 with conflicting_request on overlap",
  "[API] PATCH /api/leave-requests/:id updates a pending request and bumps version",
  "[API] PATCH /api/leave-requests/:id returns 412 with latest when expected_version is stale",
  "[API] POST /api/leave-requests/:id/approve approves and deducts balance",
  "[API] POST /api/leave-requests/:id/approve returns 422 with latest when already decided",
  "[API] POST /api/leave-requests/:id/approve returns 422 when balance is insufficient",
  "[API] POST /api/leave-requests/:id/reject rejects a pending request",
  "[UI] The leave list and balance load on first render",
  "[UI] Acting as another user reloads balance and list",
  "[UI] Submitting a leave request adds it to the list",
  "[UI] Expanding a request shows read-only details and an Edit button",
  "[UI] Clicking Edit shows the details form",
  "[UI] A successful save sends draft fields and reflects the new version",
  "[UI] A conflict shows the conflict message and applies latest when present",
  "[UI] Approving a request updates status and balance",
] as const;
