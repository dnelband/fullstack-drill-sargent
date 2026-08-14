import type { Db } from "mongodb";
import type { MemoMember, MemoRecord } from "../exercise/types.ts";

const members: MemoMember[] = [
  { _id: "m1", display_name: "Ava Owner" },
  { _id: "m2", display_name: "Ben Owner" },
];

const memos: MemoRecord[] = [
  {
    _id: "n1",
    title: "Standup notes",
    body: "Ship filter desk first",
    status: "active",
    owner_id: "m1",
    owner_name: "Ava Owner",
    version: 1,
    updated_at: "2026-08-14T10:00:00.000Z",
  },
  {
    _id: "n2",
    title: "Hiring loop",
    body: "Prefer live boards under 60m",
    status: "active",
    owner_id: "m1",
    owner_name: "Ava Owner",
    version: 2,
    updated_at: "2026-08-14T09:00:00.000Z",
  },
  {
    _id: "n3",
    title: "Ben's scratch",
    body: "Private to Ben",
    status: "active",
    owner_id: "m2",
    owner_name: "Ben Owner",
    version: 1,
    updated_at: "2026-08-14T08:00:00.000Z",
  },
  {
    _id: "n4",
    title: "Old kickoff",
    body: "Archived on purpose",
    status: "archived",
    owner_id: "m1",
    owner_name: "Ava Owner",
    version: 3,
    updated_at: "2026-08-13T10:00:00.000Z",
  },
];

export async function seedChallenge(db: Db): Promise<void> {
  await db.collection("members").deleteMany({});
  await db.collection("memos").deleteMany({});
  await db.collection<MemoMember>("members").insertMany(members);
  await db.collection<MemoRecord>("memos").insertMany(memos);
  console.log(`[db] seeded ${members.length} members, ${memos.length} memos`);
}
