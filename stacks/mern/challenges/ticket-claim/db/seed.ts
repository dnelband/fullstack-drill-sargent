import type { Db } from "mongodb";
import type { TicketMember, TicketRecord } from "../exercise/types.ts";

const members: TicketMember[] = [
  { _id: "m1", display_name: "Ava Agent" },
  { _id: "m2", display_name: "Ben Agent" },
];

const tickets: TicketRecord[] = [
  {
    _id: "t1",
    title: "Password reset loop",
    priority: "high",
    status: "open",
    claimed_by_id: null,
    claimed_by_name: null,
    created_at: "2026-08-11T14:00:00.000Z",
  },
  {
    _id: "t2",
    title: "Invoice PDF blank",
    priority: "medium",
    status: "open",
    claimed_by_id: null,
    claimed_by_name: null,
    created_at: "2026-08-11T13:00:00.000Z",
  },
  {
    _id: "t3",
    title: "SSO timeout",
    priority: "high",
    status: "claimed",
    claimed_by_id: "m2",
    claimed_by_name: "Ben Agent",
    created_at: "2026-08-11T12:00:00.000Z",
  },
  {
    _id: "t4",
    title: "Dark mode flicker",
    priority: "low",
    status: "open",
    claimed_by_id: null,
    claimed_by_name: null,
    created_at: "2026-08-11T11:00:00.000Z",
  },
  {
    _id: "t5",
    title: "Webhook retries",
    priority: "medium",
    status: "claimed",
    claimed_by_id: "m1",
    claimed_by_name: "Ava Agent",
    created_at: "2026-08-11T10:00:00.000Z",
  },
];

export async function seedChallenge(db: Db): Promise<void> {
  await db.collection<TicketMember>("members").insertMany(members);
  await db.collection<TicketRecord>("tickets").insertMany(tickets);
  console.log(`[db] seeded ${members.length} members, ${tickets.length} tickets`);
}
