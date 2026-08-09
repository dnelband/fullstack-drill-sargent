import type { SlugStudioChallengeModule } from "../../shared/slug-studio.ts";
import { currentChallenge, resolveVariant } from "../../config/current-challenge.ts";

export async function loadChallengeApp(): Promise<SlugStudioChallengeModule["ChallengeApp"]> {
  const runtimeVariant =
    import.meta.env.VITE_CHALLENGE_VARIANT ??
    (typeof process !== "undefined" ? process.env.CHALLENGE_VARIANT : undefined);
  const variant = resolveVariant(runtimeVariant);

  switch (currentChallenge.slug) {
    case "slug-studio":
      return variant === "reference"
        ? (await import("../../.solutions/slug-studio/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/slug-studio/exercise/client/App.tsx")).ChallengeApp;
    default:
      throw new Error(`Unsupported challenge slug: ${currentChallenge.slug satisfies never}`);
  }
}
