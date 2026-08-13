export type SeatStatus = "open" | "held";

export const SEAT_STATUS_OPTIONS: SeatStatus[] = ["open", "held"];

export interface SeatMember {
  _id: string;
  display_name: string;
}

export interface SeatRecord {
  _id: string;
  section: string;
  label: string;
  status: SeatStatus;
  held_by_id: string | null;
  held_by_name: string | null;
  /** ISO timestamp; null when open. Hold is active only while status=held AND held_until > server now. */
  held_until: string | null;
  notes: string;
  version: number;
}

export interface SeatSummary {
  open: number;
  held: number;
}

export interface HoldSeatInput {
  member_id: string;
}

export interface PatchSeatInput {
  member_id: string;
  expected_version: number;
  notes: string;
}
