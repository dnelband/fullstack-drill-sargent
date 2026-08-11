export type LeaveUserRole = "employee" | "manager";
export type LeaveType = "annual" | "sick" | "unpaid";
export type LeaveRequestStatus = "pending" | "approved" | "rejected";

export const LEAVE_TYPE_OPTIONS: LeaveType[] = ["annual", "sick", "unpaid"];
export const LEAVE_STATUS_OPTIONS: LeaveRequestStatus[] = [
  "pending",
  "approved",
  "rejected",
];

export const DEFAULT_ANNUAL_DAYS = 20;
export const DEFAULT_SICK_DAYS = 10;

export interface LeaveUser {
  id: string;
  display_name: string;
  role: LeaveUserRole;
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  annual_days: number;
  sick_days: number;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  user_name: string;
  type: LeaveType;
  status: LeaveRequestStatus;
  start_date: string;
  end_date: string;
  days: number;
  notes: string;
  version: number;
  updated_at: string;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
}

export interface CreateLeaveRequestInput {
  user_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  notes: string;
}

export interface UpdateLeaveRequestInput {
  expected_version: number;
  type: LeaveType;
  start_date: string;
  end_date: string;
  notes: string;
}

export interface ReviewLeaveRequestInput {
  expected_version: number;
  reviewer_id: string;
}

export interface LeaveConflictPayload {
  message: string;
  latest?: LeaveRequest;
  conflicting_request?: LeaveRequest;
}
