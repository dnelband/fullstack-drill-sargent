import type { ProductFilterChallengeModule } from "../../shared/product-filter.ts";
import { currentChallenge, resolveVariant } from "../../config/current-challenge.ts";

export async function loadChallengeApp(): Promise<
  ProductFilterChallengeModule["ChallengeApp"]
> {
  const runtimeVariant =
    import.meta.env.VITE_CHALLENGE_VARIANT ??
    (typeof process !== "undefined" ? process.env.CHALLENGE_VARIANT : undefined);
  const variant = resolveVariant(runtimeVariant);

  switch (currentChallenge.slug) {
    case "product-filter":
      return variant === "reference"
        ? (await import("../../.solutions/product-filter/client/App.tsx")).ChallengeApp
        : (await import("../../challenges/product-filter/exercise/client/App.tsx"))
            .ChallengeApp;
    default:
      throw new Error(`Unsupported challenge slug: ${currentChallenge.slug satisfies never}`);
  }
}
