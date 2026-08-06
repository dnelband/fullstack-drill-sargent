import type { DispatchBoardChallengeModule } from "../../shared/dispatch-board.ts";
import { currentChallenge, resolveVariant } from "../../config/current-challenge.ts";

export async function loadChallengeApp(): Promise<DispatchBoardChallengeModule["ChallengeApp"]> {
  const runtimeVariant =
    import.meta.env.VITE_CHALLENGE_VARIANT ??
    (typeof process !== "undefined" ? process.env.CHALLENGE_VARIANT : undefined);
  const variant = resolveVariant(runtimeVariant);

  switch (currentChallenge.slug) {
    case "dispatch-board":
      return variant === "reference"
        ? (await import("../../.solutions/dispatch-board/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/dispatch-board/exercise/client/App.tsx")).ChallengeApp;
    default:
      throw new Error(`Unsupported challenge slug: ${currentChallenge.slug}`);
  }
}
