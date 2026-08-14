export type MemoStatus = "active" | "archived";

export const MEMO_STATUS_OPTIONS: MemoStatus[] = ["active", "archived"];

export interface MemoMember {
  _id: string;
  display_name: string;
}

export interface MemoRecord {
  _id: string;
  title: string;
  body: string;
  status: MemoStatus;
  owner_id: string;
  owner_name: string;
  version: number;
  updated_at: string;
}

export interface MemoSummary {
  active: number;
  archived: number;
}

export interface PatchMemoInput {
  owner_id: string;
  expected_version: number;
  body: string;
}

export interface ArchiveMemoInput {
  owner_id: string;
  expected_version: number;
}
