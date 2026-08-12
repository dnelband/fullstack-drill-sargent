import type { Db } from "mongodb";
import type { HoldQueueItem, HoldQueueMember } from "../exercise/types.ts";

const members: HoldQueueMember[] = [
  { _id: "m1", display_name: "Ava Agent" },
  { _id: "m2", display_name: "Ben Agent" },
];

const queueItems: HoldQueueItem[] = [
  {
    _id: "q1",
    title: "Printer jam floor 2",
    priority: "high",
    status: "open",
    held_by_id: null,
    held_by_name: null,
    held_until: null,
    notes: "",
    version: 1,
    created_at: "2026-08-12T14:00:00.000Z",
  },
  {
    _id: "q2",
    title: "Badge reader offline",
    priority: "medium",
    status: "open",
    held_by_id: null,
    held_by_name: null,
    held_until: null,
    notes: "",
    version: 1,
    created_at: "2026-08-12T13:00:00.000Z",
  },
  {
    _id: "q3",
    title: "HVAC alert wing B",
    priority: "high",
    status: "held",
    held_by_id: "m2",
    held_by_name: "Ben Agent",
    held_until: "2099-01-01T00:00:00.000Z",
    notes: "Waiting on facilities",
    version: 2,
    created_at: "2026-08-12T12:00:00.000Z",
  },
  {
    _id: "q4",
    title: "Lobby display blank",
    priority: "low",
    status: "open",
    held_by_id: null,
    held_by_name: null,
    held_until: null,
    notes: "",
    version: 1,
    created_at: "2026-08-12T11:00:00.000Z",
  },
  {
    _id: "q5",
    title: "Conference dial-in noise",
    priority: "medium",
    status: "held",
    held_by_id: "m1",
    held_by_name: "Ava Agent",
    held_until: "2099-01-01T00:00:00.000Z",
    notes: "Testing mics",
    version: 3,
    created_at: "2026-08-12T10:00:00.000Z",
  },
];

export async function seedChallenge(db: Db): Promise<void> {
  await db.collection<HoldQueueMember>("members").insertMany(members);
  await db.collection<HoldQueueItem>("queue_items").insertMany(queueItems);
  console.log(
    `[db] seeded ${members.length} members, ${queueItems.length} queue_items`,
  );
}
