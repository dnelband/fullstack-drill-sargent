import type {
  Agent,
  CallbackFilters,
  CallbackRecord,
  CallbackSummary,
  ClaimCallbackInput,
  UpdateCallbackInput,
} from "../../../shared/types.ts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4010";

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

function toSearchParams(filters: CallbackFilters) {
  const searchParams = new URLSearchParams();

  if (filters.status && filters.status !== "all") {
    searchParams.set("status", filters.status);
  }

  if (filters.assigned_agent_id && filters.assigned_agent_id !== "all") {
    searchParams.set("assigned_agent_id", filters.assigned_agent_id);
  }

  if (filters.search?.trim()) {
    searchParams.set("search", filters.search.trim());
  }

  return searchParams;
}

export async function fetchAgents(): Promise<Agent[]> {
  const response = await fetch(`${API_BASE_URL}/api/agents`);
  return parseJson<Agent[]>(response);
}

export async function fetchCallbacks(
  filters: CallbackFilters,
  signal?: AbortSignal,
): Promise<CallbackRecord[]> {
  const query = toSearchParams(filters);
  const response = await fetch(`${API_BASE_URL}/api/callbacks?${query.toString()}`, {
    signal,
  });

  return parseJson<CallbackRecord[]>(response);
}

export async function claimCallback(
  callbackId: number,
  input: ClaimCallbackInput,
): Promise<CallbackRecord> {
  const response = await fetch(`${API_BASE_URL}/api/callbacks/${callbackId}/claim`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<CallbackRecord>(response);
}

export async function updateCallback(
  callbackId: number,
  input: UpdateCallbackInput,
): Promise<CallbackRecord> {
  const response = await fetch(`${API_BASE_URL}/api/callbacks/${callbackId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<CallbackRecord>(response);
}

export async function fetchSummary(): Promise<CallbackSummary> {
  const response = await fetch(`${API_BASE_URL}/api/summary`);
  return parseJson<CallbackSummary>(response);
}
