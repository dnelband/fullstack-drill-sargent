export const CHALLENGES = [
  {
    slug: "dispatch-board",
    title: "Dispatch Board",
  },
  {
    slug: "brief-desk",
    title: "Brief Desk",
  },
  {
    slug: "pulse-quiz",
    title: "Pulse Quiz",
  },
  {
    slug: "slug-studio",
    title: "Slug Studio",
  },
  {
    slug: "leave-desk",
    title: "Leave Desk",
  },
  {
    slug: "product-filter",
    title: "Product Filter Desk",
  },
  {
    slug: "orders-inbox",
    title: "Orders Inbox",
  },
  {
    slug: "ticket-claim",
    title: "Ticket Claim Desk",
  },
  {
    slug: "coupon-redeem",
    title: "Coupon Redeem Desk",
  },
] as const;

export type ChallengeSlug = (typeof CHALLENGES)[number]["slug"];

export type ChallengeMeta = (typeof CHALLENGES)[number];

export function findChallenge(slug: string): ChallengeMeta | undefined {
  return CHALLENGES.find((challenge) => challenge.slug === slug);
}

export function assertChallengeSlug(slug: string): ChallengeSlug {
  const found = findChallenge(slug);
  if (!found) {
    const known = CHALLENGES.map((challenge) => challenge.slug).join(", ");
    throw new Error(`Unknown challenge "${slug}". Known: ${known}`);
  }
  return found.slug;
}
