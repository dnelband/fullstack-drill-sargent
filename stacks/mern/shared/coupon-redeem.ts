import type { ComponentType } from "react";

export interface CouponRedeemChallengeModule {
  ChallengeApp: ComponentType;
}

/** Acting shopper for redeem UI — do not invent another id. */
export const CURRENT_USER_ID = "u1";

export const challengeTasks = [
  "[API] GET /api/coupons returns coupons ordered by code",
  "[API] GET /api/coupons filters by status",
  "[API] GET /api/coupons returns 400 for an invalid status",
  "[API] GET /api/coupons/summary returns status and redemption counts",
  "[API] POST /api/coupons/redeem redeems an active coupon",
  "[API] POST /api/coupons/redeem replays the same Idempotency-Key",
  "[API] POST /api/coupons/redeem returns 422 when Idempotency-Key body differs",
  "[API] POST /api/coupons/redeem returns 422 when the coupon is exhausted",
  "[API] POST /api/coupons/redeem returns 422 when the coupon is expired",
  "[API] POST /api/coupons/redeem returns 400 without Idempotency-Key",
  "[API] POST /api/coupons/redeem returns 404 for an unknown code",
  "[UI] The coupon list, summary, and redemptions load on first render",
  "[UI] Redeeming a coupon updates remaining and the redemption list",
  "[UI] An unprocessable redeem shows the unprocessable message",
] as const;
