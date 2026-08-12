/**
 * Stack barrel: re-exports every challenge exercise's domain types.
 * Prefer importing from `@shared/types` (or this file) in tests/seed/solutions.
 * Learners may also import from their local `exercise/types.ts`.
 */

export * from "../challenges/brief-desk/exercise/types.ts";
export * from "../challenges/pulse-quiz/exercise/types.ts";
export * from "../challenges/slug-studio/exercise/types.ts";
export * from "../challenges/leave-desk/exercise/types.ts";
export * from "../challenges/product-filter/exercise/types.ts";
export * from "../challenges/orders-inbox/exercise/types.ts";
export * from "../challenges/ticket-claim/exercise/types.ts";
export * from "../challenges/coupon-redeem/exercise/types.ts";
export * from "../challenges/hold-queue/exercise/types.ts";
export { CURRENT_USER_ID } from "./coupon-redeem.ts";
export { HOLD_TTL_MS } from "./hold-queue.ts";

/** Default API origin for exercise UIs that don't read VITE_API_BASE_URL. */
export const BASE_URL = "http://localhost:4020";
