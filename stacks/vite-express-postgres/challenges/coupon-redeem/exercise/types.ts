export type CouponStatus = "active" | "expired" | "exhausted";

export const COUPON_STATUS_OPTIONS: CouponStatus[] = [
  "active",
  "expired",
  "exhausted",
];

export interface CouponRecord {
  id: string;
  code: string;
  title: string;
  discount_percent: number;
  remaining: number;
  max_per_user: number;
  expires_at: string;
  status: CouponStatus;
}

export interface RedemptionRecord {
  id: string;
  coupon_id: string;
  code: string;
  user_id: string;
  discount_percent: number;
  idempotency_key: string;
  redeemed_at: string;
}

export interface CouponSummary {
  active: number;
  expired: number;
  exhausted: number;
  redemptions: number;
}

export interface RedeemCouponInput {
  code: string;
  user_id: string;
}

export interface IdempotencyRecord {
  id: string;
  user_id: string;
  key: string;
  body_hash: string;
  status_code: number;
  response: RedemptionRecord;
}
