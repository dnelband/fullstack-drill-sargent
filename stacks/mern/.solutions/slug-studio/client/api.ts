import type {
  PageRecord,
  PublicPage,
  PublishPageInput,
  UnpublishPageInput,
  UpdatePageInput,
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

export function fetchPages() {
  return requestJson<PageRecord[]>("/api/pages");
}

export function updatePage(id: string, input: UpdatePageInput) {
  return requestJson<PageRecord>(`/api/pages/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function publishPage(id: string, input: PublishPageInput) {
  return requestJson<PageRecord>(`/api/pages/${id}/publish`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function unpublishPage(id: string, input: UnpublishPageInput) {
  return requestJson<PageRecord>(`/api/pages/${id}/unpublish`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchPublicPage(slug: string) {
  return requestJson<PublicPage>(`/api/public/${slug}`);
}
