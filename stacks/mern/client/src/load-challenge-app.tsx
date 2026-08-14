import type { ComponentType } from "react";
import { currentChallenge, resolveVariant } from "../../config/current-challenge.ts";

export async function loadChallengeApp(): Promise<ComponentType> {
  const runtimeVariant =
    import.meta.env.VITE_CHALLENGE_VARIANT ??
    (typeof process !== "undefined" ? process.env.CHALLENGE_VARIANT : undefined);
  const variant = resolveVariant(runtimeVariant);

  switch (currentChallenge.slug) {
    case "brief-desk":
      return variant === "reference"
        ? (await import("../../.solutions/brief-desk/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/brief-desk/exercise/client/App.tsx"))
            .ChallengeApp;
    case "pulse-quiz":
      return variant === "reference"
        ? (await import("../../.solutions/pulse-quiz/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/pulse-quiz/exercise/client/App.tsx"))
            .ChallengeApp;
    case "slug-studio":
      return variant === "reference"
        ? (await import("../../.solutions/slug-studio/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/slug-studio/exercise/client/App.tsx"))
            .ChallengeApp;
    case "leave-desk":
      return variant === "reference"
        ? (await import("../../.solutions/leave-desk/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/leave-desk/exercise/client/App.tsx"))
            .ChallengeApp;
    case "product-filter":
      return variant === "reference"
        ? (await import("../../.solutions/product-filter/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/product-filter/exercise/client/App.tsx"))
            .ChallengeApp;
    case "orders-inbox":
      return variant === "reference"
        ? (await import("../../.solutions/orders-inbox/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/orders-inbox/exercise/client/App.tsx"))
            .ChallengeApp;
    case "ticket-claim":
      return variant === "reference"
        ? (await import("../../.solutions/ticket-claim/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/ticket-claim/exercise/client/App.tsx"))
            .ChallengeApp;
    case "coupon-redeem":
      return variant === "reference"
        ? (await import("../../.solutions/coupon-redeem/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/coupon-redeem/exercise/client/App.tsx"))
            .ChallengeApp;
    case "hold-queue":
      return variant === "reference"
        ? (await import("../../.solutions/hold-queue/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/hold-queue/exercise/client/App.tsx"))
            .ChallengeApp;
    case "seat-hold":
      return variant === "reference"
        ? (await import("../../.solutions/seat-hold/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/seat-hold/exercise/client/App.tsx"))
            .ChallengeApp;
    case "order-lines":
      return variant === "reference"
        ? (await import("../../.solutions/order-lines/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/order-lines/exercise/client/App.tsx"))
            .ChallengeApp;
    case "memo-desk":
      return variant === "reference"
        ? (await import("../../.solutions/memo-desk/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/memo-desk/exercise/client/App.tsx"))
            .ChallengeApp;
    default:
      throw new Error(
        `Unsupported challenge slug: ${currentChallenge.slug satisfies never}`,
      );
  }
}
