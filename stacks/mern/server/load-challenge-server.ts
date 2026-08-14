import { currentChallenge, resolveVariant } from "../config/current-challenge.ts";
import type { ChallengeServerModule } from "./types.ts";

export async function loadChallengeServerModule(): Promise<ChallengeServerModule> {
  const variant = resolveVariant(process.env.CHALLENGE_VARIANT);

  switch (currentChallenge.slug) {
    case "brief-desk":
      return variant === "reference"
        ? (await import("../.solutions/brief-desk/server/index.ts")).default
        : (await import("../challenges/brief-desk/exercise/server/index.ts")).default;
    case "pulse-quiz":
      return variant === "reference"
        ? (await import("../.solutions/pulse-quiz/server/index.ts")).default
        : (await import("../challenges/pulse-quiz/exercise/server/index.ts")).default;
    case "slug-studio":
      return variant === "reference"
        ? (await import("../.solutions/slug-studio/server/index.ts")).default
        : (await import("../challenges/slug-studio/exercise/server/index.ts")).default;
    case "leave-desk":
      return variant === "reference"
        ? (await import("../.solutions/leave-desk/server/index.ts")).default
        : (await import("../challenges/leave-desk/exercise/server/index.ts")).default;
    case "product-filter":
      return variant === "reference"
        ? (await import("../.solutions/product-filter/server/index.ts")).default
        : (await import("../challenges/product-filter/exercise/server/index.ts")).default;
    case "orders-inbox":
      return variant === "reference"
        ? (await import("../.solutions/orders-inbox/server/index.ts")).default
        : (await import("../challenges/orders-inbox/exercise/server/index.ts")).default;
    case "ticket-claim":
      return variant === "reference"
        ? (await import("../.solutions/ticket-claim/server/index.ts")).default
        : (await import("../challenges/ticket-claim/exercise/server/index.ts")).default;
    case "coupon-redeem":
      return variant === "reference"
        ? (await import("../.solutions/coupon-redeem/server/index.ts")).default
        : (await import("../challenges/coupon-redeem/exercise/server/index.ts")).default;
    case "hold-queue":
      return variant === "reference"
        ? (await import("../.solutions/hold-queue/server/index.ts")).default
        : (await import("../challenges/hold-queue/exercise/server/index.ts")).default;
    case "seat-hold":
      return variant === "reference"
        ? (await import("../.solutions/seat-hold/server/index.ts")).default
        : (await import("../challenges/seat-hold/exercise/server/index.ts")).default;
    case "order-lines":
      return variant === "reference"
        ? (await import("../.solutions/order-lines/server/index.ts")).default
        : (await import("../challenges/order-lines/exercise/server/index.ts"))
            .default;
    case "memo-desk":
      return variant === "reference"
        ? (await import("../.solutions/memo-desk/server/index.ts")).default
        : (await import("../challenges/memo-desk/exercise/server/index.ts")).default;
    default:
      throw new Error(
        `Unsupported challenge slug: ${currentChallenge.slug satisfies never}`,
      );
  }
}
