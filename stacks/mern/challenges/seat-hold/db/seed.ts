import type { Db } from "mongodb";
import type { SeatMember, SeatRecord } from "../exercise/types.ts";

const members: SeatMember[] = [
  { _id: "m1", display_name: "Ava Buyer" },
  { _id: "m2", display_name: "Ben Buyer" },
];

const seats: SeatRecord[] = [
  {
    _id: "s1",
    section: "Orchestra",
    label: "A1",
    status: "open",
    held_by_id: null,
    held_by_name: null,
    held_until: null,
    notes: "",
    version: 1,
  },
  {
    _id: "s2",
    section: "Orchestra",
    label: "A2",
    status: "open",
    held_by_id: null,
    held_by_name: null,
    held_until: null,
    notes: "",
    version: 1,
  },
  {
    _id: "s3",
    section: "Orchestra",
    label: "B1",
    status: "held",
    held_by_id: "m2",
    held_by_name: "Ben Buyer",
    held_until: "2099-01-01T00:00:00.000Z",
    notes: "Paid deposit",
    version: 2,
  },
  {
    _id: "s4",
    section: "Balcony",
    label: "C1",
    // Stored as held, but held_until is in the past → effective open
    status: "held",
    held_by_id: "m2",
    held_by_name: "Ben Buyer",
    held_until: "2020-01-01T00:00:00.000Z",
    notes: "Expired hold",
    version: 2,
  },
  {
    _id: "s5",
    section: "Balcony",
    label: "C2",
    status: "held",
    held_by_id: "m1",
    held_by_name: "Ava Buyer",
    held_until: "2099-01-01T00:00:00.000Z",
    notes: "Aisle preference",
    version: 3,
  },
];

export async function seedChallenge(db: Db): Promise<void> {
  // Always replace challenge data (reset should have cleared; this makes prepare idempotent).
  await db.collection("members").deleteMany({});
  await db.collection("seats").deleteMany({});
  await db.collection<SeatMember>("members").insertMany(members);
  await db.collection<SeatRecord>("seats").insertMany(seats);
  const s5 = await db.collection("seats").findOne({ _id: "s5" });
  console.log(
    `[db] seeded ${members.length} members, ${seats.length} seats (s5.held_until=${String(s5?.held_until)})`,
  );
}
