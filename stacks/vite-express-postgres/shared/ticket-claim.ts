import type { ComponentType } from "react";

export interface TicketClaimChallengeModule {
  ChallengeApp: ComponentType;
}

export const challengeTasks = [
  "[API] GET /api/tickets returns tickets ordered by created_at desc",
  "[API] GET /api/tickets filters by status",
  "[API] GET /api/tickets returns 400 for an invalid status",
  "[API] GET /api/tickets/summary returns open and claimed counts",
  "[API] POST /api/tickets/:id/claim claims an open ticket",
  "[API] POST /api/tickets/:id/claim returns 409 with latest when already claimed",
  "[UI] The ticket list and summary load on first render",
  "[UI] Claiming a ticket updates the row and summary",
  "[UI] A lost claim shows the conflict message and refetches the list",
  "[UI] List rows expose title and status tiles",
] as const;
