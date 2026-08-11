export type CallbackStatus = "open" | "claimed" | "completed";

export interface Agent {
  id: string;
  display_name: string;
  team: string;
}

export interface CallbackRecord {
  id: number;
  customer_name: string;
  topic: string;
  priority: "high" | "medium" | "low";
  status: CallbackStatus;
  assigned_agent_id: string | null;
  assigned_agent_name: string | null;
  scheduled_for: string;
  notes: string;
  version: number;
  updated_at: string;
}

export type CallbackUpdateFields = Pick<
  CallbackRecord,
  "id" | "notes" | "status" | "version"
>;

export interface CallbackSummary {
  open: number;
  claimed: number;
  completed: number;
}

export interface CallbackFilters {
  status?: CallbackStatus | "all";
  assigned_agent_id?: string | "all";
  search?: string;
}

export interface ClaimCallbackInput {
  agent_id: string;
}

export interface UpdateCallbackInput {
  expected_version: number;
  status: CallbackStatus;
  notes: string;
}

export interface ChallengeTask {
  id: string;
  title: string;
}

/** Acting agent for claim UI — do not invent another id. */
export const CURRENT_AGENT_ID = "a1";
