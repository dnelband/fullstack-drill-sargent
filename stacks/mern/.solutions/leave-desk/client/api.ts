import type {
  CreateLeaveRequestInput,
  LeaveBalance,
  LeaveRequest,
  LeaveUser,
  ReviewLeaveRequestInput,
  UpdateLeaveRequestInput,
} from "../../../shared/types.ts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4020";

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = await readJson<Record<string, unknown>>(response);
  if (!response.ok) {
    throw new ApiError(
      String(payload.message ?? "Request failed"),
      response.status,
      payload,
    );
  }
  return payload as unknown as T;
}

export function fetchUsers() {
  return requestJson<LeaveUser[]>("/api/users");
}

export function fetchLeaveBalance(userId: string) {
  return requestJson<LeaveBalance>(
    `/api/leave-balance?user_id=${encodeURIComponent(userId)}`,
  );
}

export function fetchLeaveRequests(params: {
  status?: string;
  type?: string;
  user_id?: string;
} = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.type) query.set("type", params.type);
  if (params.user_id) query.set("user_id", params.user_id);
  const suffix = query.toString() ? `?${query}` : "";
  return requestJson<LeaveRequest[]>(`/api/leave-requests${suffix}`);
}

export function createLeaveRequest(input: CreateLeaveRequestInput) {
  return requestJson<LeaveRequest>("/api/leave-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateLeaveRequest(id: string, input: UpdateLeaveRequestInput) {
  return requestJson<LeaveRequest>(`/api/leave-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function approveLeaveRequest(id: string, input: ReviewLeaveRequestInput) {
  return requestJson<LeaveRequest>(`/api/leave-requests/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function rejectLeaveRequest(id: string, input: ReviewLeaveRequestInput) {
  return requestJson<LeaveRequest>(`/api/leave-requests/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
