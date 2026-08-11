export const currentChallenge = {
  slug: "product-filter",
  title: "Product Filter Desk",
} as const;

export type ChallengeSlug = typeof currentChallenge.slug;
export type ChallengeVariant = "exercise" | "reference";

export function resolveVariant(input: string | undefined): ChallengeVariant {
  return input === "reference" ? "reference" : "exercise";
}
