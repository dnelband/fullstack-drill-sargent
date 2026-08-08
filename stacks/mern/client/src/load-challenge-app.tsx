import type { PulseQuizChallengeModule } from "../../shared/pulse-quiz.ts";
import { currentChallenge, resolveVariant } from "../../config/current-challenge.ts";

export async function loadChallengeApp(): Promise<PulseQuizChallengeModule["ChallengeApp"]> {
  const runtimeVariant =
    import.meta.env.VITE_CHALLENGE_VARIANT ??
    (typeof process !== "undefined" ? process.env.CHALLENGE_VARIANT : undefined);
  const variant = resolveVariant(runtimeVariant);

  switch (currentChallenge.slug) {
    case "pulse-quiz":
      return variant === "reference"
        ? (await import("../../.solutions/pulse-quiz/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/pulse-quiz/exercise/client/App.tsx")).ChallengeApp;
    default:
      throw new Error(`Unsupported challenge slug: ${currentChallenge.slug satisfies never}`);
  }
}
