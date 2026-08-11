export type TicketStatus = "open" | "claimed";

export const TICKET_STATUS_OPTIONS: TicketStatus[] = ["open", "claimed"];

export interface TicketMember {
  id: string;
  display_name: string;
}

export interface TicketRecord {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  status: TicketStatus;
  claimed_by_id: string | null;
  claimed_by_name: string | null;
  created_at: string;
}

export interface TicketSummary {
  open: number;
  claimed: number;
}

export interface ClaimTicketInput {
  member_id: string;
}

/** Acting agent for claim UI — do not invent another id. */
export const CURRENT_MEMBER_ID = "m1";
