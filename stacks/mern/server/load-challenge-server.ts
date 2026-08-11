import { currentChallenge, resolveVariant } from "../config/current-challenge.ts";
import type { ChallengeServerModule } from "./types.ts";

export async function loadChallengeServerModule(): Promise<ChallengeServerModule> {
  const variant = resolveVariant(process.env.CHALLENGE_VARIANT);

  switch (currentChallenge.slug) {
    case "orders-inbox":
      return variant === "reference"
        ? (await import("../.solutions/orders-inbox/server/index.ts")).default
        : (await import("../challenges/orders-inbox/exercise/server/index.ts")).default;
    default:
      throw new Error(`Unsupported challenge slug: ${currentChallenge.slug satisfies never}`);
  }
}
