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
    default:
      throw new Error(`Unsupported challenge slug: ${currentChallenge.slug}`);
  }
}
