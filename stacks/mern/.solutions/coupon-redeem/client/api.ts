import type {
  CouponRecord,
  CouponStatus,
  CouponSummary,
  RedeemCouponInput,
  RedemptionRecord,
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

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
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

export function fetchCoupons(status: CouponStatus | "all" = "all") {
  const query = new URLSearchParams({ status });
  return requestJson<CouponRecord[]>(`/api/coupons?${query}`);
}

export function fetchCouponSummary() {
  return requestJson<CouponSummary>("/api/coupons/summary");
}

export function fetchRedemptions() {
  return requestJson<RedemptionRecord[]>("/api/redemptions");
}

export function redeemCoupon(
  input: RedeemCouponInput,
  idempotencyKey: string,
) {
  return requestJson<RedemptionRecord>("/api/coupons/redeem", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(input),
  });
}
