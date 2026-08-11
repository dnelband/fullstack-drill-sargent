import type { ComponentType } from "react";

export interface BriefDeskChallengeModule {
  ChallengeApp: ComponentType;
}

export const challengeTasks = [
  "[API] GET /api/members returns all seeded members ordered by display_name",
  "[API] GET /api/briefs defaults to status open when no status query is provided",
  "[API] GET /api/briefs orders results by priority then due_at",
  "[API] GET /api/briefs filters by status, assignee, and search text",
  "[API] POST /api/briefs/:id/claim assigns an open brief and increments its version",
  "[API] POST /api/briefs/:id/claim rejects a second claim for the same brief",
  "[API] Concurrent claim requests allow exactly one winner for the same brief",
  "[API] PATCH /api/briefs/:id updates notes and status and increments version when the expected version matches",
  "[API] PATCH /api/briefs/:id returns 409 with message and latest brief when a stale version is submitted",
  "[UI] First render shows summary counts",
  "[UI] First render shows the initial brief list",
  "[UI] The brief list shows brief details (client name, title, priority, status, assignee) from the API response",
  "[UI] Status filter is available",
  "[UI] Search filter is available",
  "[UI] Assignee filter is available",
  "[UI] Assignee filter lists members from the API",
  "[UI] Status filter changes the visible briefs",
  "[UI] Assignee filter changes the visible briefs",
  "[UI] Search filter changes the visible briefs",
  "[UI] Claiming a brief updates summary and shows assignee under the claimed filter",
  "[UI] Expanding a brief shows read-only details and an Edit button",
  "[UI] Clicking Edit shows the details form (notes, details status, save)",
  "[UI] The details form starts with notes and version from the selected brief",
  "[UI] A successful save reflects the draft notes, status, and version",
  "[UI] A 409 save shows the server message and latest notes/version",
  "[UI] Detail controls are disabled while a save is pending",
] as const;
