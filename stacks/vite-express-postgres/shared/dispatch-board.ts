import type { ComponentType } from "react";

export interface DispatchBoardChallengeModule {
  ChallengeApp: ComponentType;
}

export const challengeTasks = [
  "[API] GET /api/agents returns all seeded agents ordered by display_name",
  "[API] GET /api/callbacks defaults to status open when no status query is provided",
  "[API] GET /api/callbacks orders results by priority then scheduled_for",
  "[API] GET /api/callbacks filters by status, assignee, and search text",
  "[API] POST /api/callbacks/:id/claim assigns an open callback and increments its version",
  "[API] POST /api/callbacks/:id/claim rejects a second claim for the same callback",
  "[API] Concurrent claim requests allow exactly one winner for the same callback",
  "[API] PATCH /api/callbacks/:id updates notes and status and increments version when the expected version matches",
  "[API] PATCH /api/callbacks/:id returns 409 with message and latest callback when a stale version is submitted",
  "[UI] First render shows summary counts",
  "[UI] First render shows the initial callback list",
  "[UI] The callback list shows callback details (customer name, topic, priority, status, assignee) from the API response",
  "[UI] Status filter is available",
  "[UI] Search filter is available",
  "[UI] Assignee filter is available",
  "[UI] Assignee filter lists agents from the API",
  "[UI] Status filter changes the visible callbacks",
  "[UI] Assignee filter changes the visible callbacks",
  "[UI] Search filter changes the visible callbacks",
  "[UI] Claiming a callback updates summary and shows assignee under the claimed filter",
  "[UI] Expanding a callback shows read-only details and an Edit button",
  "[UI] Clicking Edit shows the details form (notes, details status, save)",
  "[UI] The details form starts with notes and version from the selected callback",
  "[UI] A 409 save shows the server message and latest notes/version",
  "[UI] Detail controls are disabled while a save is pending",
] as const;
