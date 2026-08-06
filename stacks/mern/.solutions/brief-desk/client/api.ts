import type {
  BriefFilters,
  BriefRecord,
  BriefSummary,
  ClaimBriefInput,
  Member,
  UpdateBriefInput,
} from "../../../shared/types.ts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4020";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Request failed" }));
    throw new ApiError(
      (payload as { message?: string }).message ?? "Request failed",
      response.status,
      payload,
    );
  }

  return (await response.json()) as T;
}

function toSearchParams(filters: BriefFilters) {
  const searchParams = new URLSearchParams();
  if (filters.status && filters.status !== "all") {
    searchParams.set("status", filters.status);
  }
  if (filters.assigned_member_id && filters.assigned_member_id !== "all") {
    searchParams.set("assigned_member_id", filters.assigned_member_id);
  }
  if (filters.search?.trim()) {
    searchParams.set("search", filters.search.trim());
  }
  return searchParams;
}

export async function fetchMembers(): Promise<Member[]> {
  const response = await fetch(`${API_BASE_URL}/api/members`);
  return parseJson<Member[]>(response);
}

export async function fetchBriefs(filters: BriefFilters): Promise<BriefRecord[]> {
  const query = toSearchParams(filters);
  const response = await fetch(`${API_BASE_URL}/api/briefs?${query.toString()}`);
  return parseJson<BriefRecord[]>(response);
}

export async function fetchSummary(): Promise<BriefSummary> {
  const response = await fetch(`${API_BASE_URL}/api/summary`);
  return parseJson<BriefSummary>(response);
}

export async function claimBrief(briefId: string, input: ClaimBriefInput): Promise<BriefRecord> {
  const response = await fetch(`${API_BASE_URL}/api/briefs/${briefId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<BriefRecord>(response);
}

export async function updateBrief(briefId: string, input: UpdateBriefInput): Promise<BriefRecord> {
  const response = await fetch(`${API_BASE_URL}/api/briefs/${briefId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<BriefRecord>(response);
}
