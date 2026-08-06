import type { BriefDeskChallengeModule } from "../../shared/brief-desk.ts";
import { currentChallenge, resolveVariant } from "../../config/current-challenge.ts";

export async function loadChallengeApp(): Promise<BriefDeskChallengeModule["ChallengeApp"]> {
  const runtimeVariant =
    import.meta.env.VITE_CHALLENGE_VARIANT ??
    (typeof process !== "undefined" ? process.env.CHALLENGE_VARIANT : undefined);
  const variant = resolveVariant(runtimeVariant);

  switch (currentChallenge.slug) {
    case "brief-desk":
      return variant === "reference"
        ? (await import("../../.solutions/brief-desk/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/brief-desk/exercise/client/App.tsx")).ChallengeApp;
    default:
      throw new Error(`Unsupported challenge slug: ${currentChallenge.slug}`);
  }
}
