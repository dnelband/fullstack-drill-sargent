import { currentChallenge, resolveVariant } from "../config/current-challenge.ts";
import type { ChallengeServerModule } from "./types.ts";

export async function loadChallengeServerModule(): Promise<ChallengeServerModule> {
  const variant = resolveVariant(process.env.CHALLENGE_VARIANT);

  switch (currentChallenge.slug) {
    case "pulse-quiz":
      return variant === "reference"
        ? (await import("../.solutions/pulse-quiz/server/index.ts")).default
        : (await import("../challenges/pulse-quiz/exercise/server/index.ts")).default;
    default:
      throw new Error(`Unsupported challenge slug: ${currentChallenge.slug satisfies never}`);
  }
}
