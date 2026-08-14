export const CHALLENGES = [
  {
    slug: "brief-desk",
    title: "Brief Desk",
    mongoDb: "practice_brief_desk",
  },
  {
    slug: "pulse-quiz",
    title: "Pulse Quiz",
    mongoDb: "practice_pulse_quiz",
  },
  {
    slug: "slug-studio",
    title: "Slug Studio",
    mongoDb: "practice_slug_studio",
  },
  {
    slug: "leave-desk",
    title: "Leave Desk",
    mongoDb: "practice_leave_desk",
  },
  {
    slug: "product-filter",
    title: "Product Filter Desk",
    mongoDb: "practice_product_filter",
  },
  {
    slug: "orders-inbox",
    title: "Orders Inbox",
    mongoDb: "practice_orders_inbox",
  },
  {
    slug: "ticket-claim",
    title: "Ticket Claim Desk",
    mongoDb: "practice_ticket_claim",
  },
  {
    slug: "coupon-redeem",
    title: "Coupon Redeem Desk",
    mongoDb: "practice_coupon_redeem",
  },
  {
    slug: "hold-queue",
    title: "Hold Queue",
    mongoDb: "practice_hold_queue",
  },
  {
    slug: "seat-hold",
    title: "Seat Hold",
    mongoDb: "practice_seat_hold",
  },
  {
    slug: "order-lines",
    title: "Order Lines",
    mongoDb: "practice_order_lines",
  },
  {
    slug: "memo-desk",
    title: "Memo Desk",
    mongoDb: "practice_memo_desk",
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
