export const currentChallenge = {
  slug: "orders-inbox",
  title: "Orders Inbox",
} as const;

export type ChallengeSlug = typeof currentChallenge.slug;
export type ChallengeVariant = "exercise" | "reference";

export function resolveVariant(input: string | undefined): ChallengeVariant {
  return input === "reference" ? "reference" : "exercise";
}
