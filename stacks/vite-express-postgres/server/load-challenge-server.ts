import { currentChallenge, resolveVariant } from "../config/current-challenge.ts";
import type { ChallengeServerModule } from "./types.ts";

export async function loadChallengeServerModule(): Promise<ChallengeServerModule> {
  const variant = resolveVariant(process.env.CHALLENGE_VARIANT);

  switch (currentChallenge.slug) {
    case "dispatch-board": {
      const module =
        variant === "reference"
          ? await import("../.solutions/dispatch-board/server/index.ts")
          : await import("../challenges/dispatch-board/exercise/server/index.ts");
      return module.default;
    }
    case "brief-desk": {
      const module =
        variant === "reference"
          ? await import("../.solutions/brief-desk/server/index.ts")
          : await import("../challenges/brief-desk/exercise/server/index.ts");
      return module.default;
    }
    case "pulse-quiz": {
      const module =
        variant === "reference"
          ? await import("../.solutions/pulse-quiz/server/index.ts")
          : await import("../challenges/pulse-quiz/exercise/server/index.ts");
      return module.default;
    }
    case "slug-studio": {
      const module =
        variant === "reference"
          ? await import("../.solutions/slug-studio/server/index.ts")
          : await import("../challenges/slug-studio/exercise/server/index.ts");
      return module.default;
    }
    case "leave-desk": {
      const module =
        variant === "reference"
          ? await import("../.solutions/leave-desk/server/index.ts")
          : await import("../challenges/leave-desk/exercise/server/index.ts");
      return module.default;
    }
    case "product-filter": {
      const module =
        variant === "reference"
          ? await import("../.solutions/product-filter/server/index.ts")
          : await import("../challenges/product-filter/exercise/server/index.ts");
      return module.default;
    }
    case "orders-inbox": {
      const module =
        variant === "reference"
          ? await import("../.solutions/orders-inbox/server/index.ts")
          : await import("../challenges/orders-inbox/exercise/server/index.ts");
      return module.default;
    }
    case "ticket-claim": {
      const module =
        variant === "reference"
          ? await import("../.solutions/ticket-claim/server/index.ts")
          : await import("../challenges/ticket-claim/exercise/server/index.ts");
      return module.default;
    }
    case "coupon-redeem": {
      const module =
        variant === "reference"
          ? await import("../.solutions/coupon-redeem/server/index.ts")
          : await import("../challenges/coupon-redeem/exercise/server/index.ts");
      return module.default;
    }
    default:
      throw new Error(`Unsupported challenge slug: ${currentChallenge.slug}`);
  }
}
