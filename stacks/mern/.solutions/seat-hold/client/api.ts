import type {
  HoldSeatInput,
  PatchSeatInput,
  SeatRecord,
  SeatStatus,
  SeatSummary,
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

export function fetchSeats(status: SeatStatus | "all" = "all") {
  const query = new URLSearchParams({ status });
  return requestJson<SeatRecord[]>(`/api/seats?${query}`);
}

export function fetchSeatSummary() {
  return requestJson<SeatSummary>("/api/seats/summary");
}

export function holdSeat(id: string, input: HoldSeatInput) {
  return requestJson<SeatRecord>(`/api/seats/${id}/hold`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function patchSeat(id: string, input: PatchSeatInput) {
  return requestJson<SeatRecord>(`/api/seats/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
