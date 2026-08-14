import type {
  AddOrderLineInput,
  CatalogProduct,
  DeleteOrderLineInput,
  DraftOrderRecord,
  DraftOrderStatus,
  DraftOrderSummary,
  PatchOrderLineInput,
  SubmitOrderInput,
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

export function fetchProducts(): Promise<CatalogProduct[]> {
  return requestJson("/api/products");
}

export function fetchOrders(
  status: DraftOrderStatus | "all" = "all",
): Promise<DraftOrderRecord[]> {
  const query = new URLSearchParams({ status });
  return requestJson(`/api/orders?${query.toString()}`);
}

export function fetchOrderSummary(): Promise<DraftOrderSummary> {
  return requestJson("/api/orders/summary");
}

export function addOrderLine(
  orderId: string,
  body: AddOrderLineInput,
): Promise<DraftOrderRecord> {
  return requestJson(`/api/orders/${orderId}/lines`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchOrderLine(
  orderId: string,
  lineId: string,
  body: PatchOrderLineInput,
): Promise<DraftOrderRecord> {
  return requestJson(`/api/orders/${orderId}/lines/${lineId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteOrderLine(
  orderId: string,
  lineId: string,
  body: DeleteOrderLineInput,
): Promise<DraftOrderRecord> {
  return requestJson(`/api/orders/${orderId}/lines/${lineId}`, {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

export function submitOrder(
  orderId: string,
  body: SubmitOrderInput,
): Promise<DraftOrderRecord> {
  return requestJson(`/api/orders/${orderId}/submit`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
