export type BriefStatus = "open" | "claimed" | "completed";
export type BriefPriority = "high" | "medium" | "low";

export const BRIEF_STATUS_OPTIONS: BriefStatus[] = [
  "claimed",
  "completed",
  "open",
];

export interface Member {
  id: string;
  display_name: string;
  discipline: string;
}

export interface BriefRecord {
  id: string;
  client_name: string;
  title: string;
  priority: BriefPriority;
  status: BriefStatus;
  assigned_member_id: string | null;
  assigned_member_name: string | null;
  due_at: string;
  notes: string;
  version: number;
  updated_at: string;
}

export interface BriefSummary {
  open: number;
  claimed: number;
  completed: number;
}

export interface BriefFilters {
  status?: BriefStatus | "all";
  assigned_member_id?: string | "all";
  search?: string;
}

export interface ClaimBriefInput {
  member_id: string;
}

export interface UpdateBriefInput {
  expected_version: number;
  status: BriefStatus;
  notes: string;
}
