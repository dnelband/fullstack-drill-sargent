export const currentChallenge = {
  slug: "slug-studio",
  title: "Slug Publish Studio",
} as const;

export type ChallengeSlug = typeof currentChallenge.slug;
export type ChallengeVariant = "exercise" | "reference";

export function resolveVariant(input: string | undefined): ChallengeVariant {
  return input === "reference" ? "reference" : "exercise";
}
