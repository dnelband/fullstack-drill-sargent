import type {
  ArchiveMemoInput,
  MemoRecord,
  MemoStatus,
  MemoSummary,
  PatchMemoInput,
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
  return payload as T;
}

export function fetchMemos(
  status: MemoStatus | "all" = "all",
): Promise<MemoRecord[]> {
  const query = new URLSearchParams({ status });
  return requestJson(`/api/memos?${query.toString()}`);
}

export function fetchMemoSummary(): Promise<MemoSummary> {
  return requestJson("/api/memos/summary");
}

export function patchMemo(
  id: string,
  body: PatchMemoInput,
): Promise<MemoRecord> {
  return requestJson(`/api/memos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function archiveMemo(
  id: string,
  body: ArchiveMemoInput,
): Promise<MemoRecord> {
  return requestJson(`/api/memos/${id}/archive`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
