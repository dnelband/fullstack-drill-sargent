import type { ComponentType } from "react";
import { currentChallenge, resolveVariant } from "../../config/current-challenge.ts";

type ChallengeAppModule = { ChallengeApp: ComponentType };

export async function loadChallengeApp(): Promise<ComponentType> {
  const runtimeVariant =
    import.meta.env.VITE_CHALLENGE_VARIANT ??
    (typeof process !== "undefined" ? process.env.CHALLENGE_VARIANT : undefined);
  const variant = resolveVariant(runtimeVariant);

  switch (currentChallenge.slug) {
    case "dispatch-board": {
      const module: ChallengeAppModule =
        variant === "reference"
          ? await import("../../.solutions/dispatch-board/client/App.tsx")
          : await import("../../challenges/dispatch-board/exercise/client/App.tsx");
      return module.ChallengeApp;
    }
    case "brief-desk": {
      const module: ChallengeAppModule =
        variant === "reference"
          ? await import("../../.solutions/brief-desk/client/App.tsx")
          : await import("../../challenges/brief-desk/exercise/client/App.tsx");
      return module.ChallengeApp;
    }
    case "pulse-quiz": {
      const module: ChallengeAppModule =
        variant === "reference"
          ? await import("../../.solutions/pulse-quiz/client/App.tsx")
          : await import("../../challenges/pulse-quiz/exercise/client/App.tsx");
      return module.ChallengeApp;
    }
    case "slug-studio": {
      const module: ChallengeAppModule =
        variant === "reference"
          ? await import("../../.solutions/slug-studio/client/App.tsx")
          : await import("../../challenges/slug-studio/exercise/client/App.tsx");
      return module.ChallengeApp;
    }
    case "leave-desk": {
      const module: ChallengeAppModule =
        variant === "reference"
          ? await import("../../.solutions/leave-desk/client/App.tsx")
          : await import("../../challenges/leave-desk/exercise/client/App.tsx");
      return module.ChallengeApp;
    }
    case "product-filter": {
      const module: ChallengeAppModule =
        variant === "reference"
          ? await import("../../.solutions/product-filter/client/App.tsx")
          : await import("../../challenges/product-filter/exercise/client/App.tsx");
      return module.ChallengeApp;
    }
    case "orders-inbox": {
      const module: ChallengeAppModule =
        variant === "reference"
          ? await import("../../.solutions/orders-inbox/client/App.tsx")
          : await import("../../challenges/orders-inbox/exercise/client/App.tsx");
      return module.ChallengeApp;
    }
    case "ticket-claim": {
      const module: ChallengeAppModule =
        variant === "reference"
          ? await import("../../.solutions/ticket-claim/client/App.tsx")
          : await import("../../challenges/ticket-claim/exercise/client/App.tsx");
      return module.ChallengeApp;
    }
    case "coupon-redeem": {
      const module: ChallengeAppModule =
        variant === "reference"
          ? await import("../../.solutions/coupon-redeem/client/App.tsx")
          : await import("../../challenges/coupon-redeem/exercise/client/App.tsx");
      return module.ChallengeApp;
    }
    default:
      throw new Error(`Unsupported challenge slug: ${currentChallenge.slug}`);
  }
}
