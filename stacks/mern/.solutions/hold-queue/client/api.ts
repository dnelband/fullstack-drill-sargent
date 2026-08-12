import type {
  HoldQueueHoldInput,
  HoldQueueItem,
  HoldQueuePatchInput,
  HoldQueueStatus,
  HoldQueueSummary,
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

export function fetchQueue(status: HoldQueueStatus | "all" = "all") {
  const query = new URLSearchParams({ status });
  return requestJson<HoldQueueItem[]>(`/api/queue?${query}`);
}

export function fetchQueueSummary() {
  return requestJson<HoldQueueSummary>("/api/queue/summary");
}

export function holdItem(id: string, input: HoldQueueHoldInput) {
  return requestJson<HoldQueueItem>(`/api/queue/${id}/hold`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function patchItem(id: string, input: HoldQueuePatchInput) {
  return requestJson<HoldQueueItem>(`/api/queue/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
