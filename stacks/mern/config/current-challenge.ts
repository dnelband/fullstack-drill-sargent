import activeChallenge from "./active-challenge.json" with { type: "json" };
import {
  assertChallengeSlug,
  findChallenge,
  type ChallengeSlug,
} from "./challenges.ts";

const slug = assertChallengeSlug(activeChallenge.slug);
const meta = findChallenge(slug)!;

export const currentChallenge = {
  slug: meta.slug,
  title: meta.title,
  mongoDb: meta.mongoDb,
} as const;

export type { ChallengeSlug };
export type ChallengeVariant = "exercise" | "reference";

export function resolveVariant(input: string | undefined): ChallengeVariant {
  return input === "reference" ? "reference" : "exercise";
}
