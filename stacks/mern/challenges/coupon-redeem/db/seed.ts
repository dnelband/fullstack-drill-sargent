import type { Db } from "mongodb";
import type { CouponRecord } from "../exercise/types.ts";

const coupons: CouponRecord[] = [
  {
    _id: "c1",
    code: "WELCOME10",
    title: "Welcome ten percent",
    discount_percent: 10,
    remaining: 5,
    max_per_user: 2,
    expires_at: "2027-01-01T00:00:00.000Z",
    status: "active",
  },
  {
    _id: "c2",
    code: "FLASH50",
    title: "Flash fifty",
    discount_percent: 50,
    remaining: 1,
    max_per_user: 1,
    expires_at: "2027-06-01T00:00:00.000Z",
    status: "active",
  },
  {
    _id: "c3",
    code: "OLDIE20",
    title: "Expired twenty",
    discount_percent: 20,
    remaining: 3,
    max_per_user: 1,
    expires_at: "2020-01-01T00:00:00.000Z",
    status: "expired",
  },
  {
    _id: "c4",
    code: "GONE15",
    title: "Exhausted fifteen",
    discount_percent: 15,
    remaining: 0,
    max_per_user: 1,
    expires_at: "2027-01-01T00:00:00.000Z",
    status: "exhausted",
  },
  {
    _id: "c5",
    code: "SAVE25",
    title: "Save twenty five",
    discount_percent: 25,
    remaining: 8,
    max_per_user: 3,
    expires_at: "2027-12-01T00:00:00.000Z",
    status: "active",
  },
];

export async function seedChallenge(db: Db): Promise<void> {
  await db.collection<CouponRecord>("coupons").insertMany(coupons);
  await db.collection("redemptions").deleteMany({});
  await db.collection("idempotency_keys").deleteMany({});
  console.log(`[db] seeded ${coupons.length} coupons`);
}
