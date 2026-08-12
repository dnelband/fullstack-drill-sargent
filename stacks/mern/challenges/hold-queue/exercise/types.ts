export type HoldQueueStatus = "open" | "held";

export const HOLD_QUEUE_STATUS_OPTIONS: HoldQueueStatus[] = ["open", "held"];

export interface HoldQueueMember {
  _id: string;
  display_name: string;
}

export interface HoldQueueItem {
  _id: string;
  title: string;
  priority: "high" | "medium" | "low";
  status: HoldQueueStatus;
  held_by_id: string | null;
  held_by_name: string | null;
  /** ISO timestamp; null when open. Hold is active only while status=held AND held_until > server now. */
  held_until: string | null;
  notes: string;
  version: number;
  created_at: string;
}

export interface HoldQueueSummary {
  open: number;
  held: number;
}

export interface HoldQueueHoldInput {
  member_id: string;
}

export interface HoldQueuePatchInput {
  member_id: string;
  expected_version: number;
  notes: string;
}
