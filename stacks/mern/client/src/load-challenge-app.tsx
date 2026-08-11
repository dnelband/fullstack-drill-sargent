import type { OrdersInboxChallengeModule } from "../../shared/orders-inbox.ts";
import { currentChallenge, resolveVariant } from "../../config/current-challenge.ts";

export async function loadChallengeApp(): Promise<
  OrdersInboxChallengeModule["ChallengeApp"]
> {
  const runtimeVariant =
    import.meta.env.VITE_CHALLENGE_VARIANT ??
    (typeof process !== "undefined" ? process.env.CHALLENGE_VARIANT : undefined);
  const variant = resolveVariant(runtimeVariant);

  switch (currentChallenge.slug) {
    case "orders-inbox":
      return variant === "reference"
        ? (await import("../../.solutions/orders-inbox/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/orders-inbox/exercise/client/App.tsx"))
            .ChallengeApp;
    default:
      throw new Error(`Unsupported challenge slug: ${currentChallenge.slug satisfies never}`);
  }
}
