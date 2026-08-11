import type { Db } from "mongodb";
import type { LeaveBalance, LeaveRequest, LeaveUser } from "../exercise/types.ts";

const users: LeaveUser[] = [
  { _id: "u1", display_name: "Ava Employee", role: "employee" },
  { _id: "u2", display_name: "Morgan Manager", role: "manager" },
  { _id: "u3", display_name: "Sam Employee", role: "employee" },
];

const balances: LeaveBalance[] = [
  { _id: "bal-u1", user_id: "u1", annual_days: 20, sick_days: 10 },
  { _id: "bal-u3", user_id: "u3", annual_days: 15, sick_days: 5 },
];

const requests: LeaveRequest[] = [
  {
    _id: "lr1",
    user_id: "u1",
    user_name: "Ava Employee",
    type: "annual",
    status: "pending",
    start_date: "2026-09-01",
    end_date: "2026-09-03",
    days: 3,
    notes: "Family trip",
    version: 1,
    updated_at: "2026-08-01T12:00:00.000Z",
    reviewed_by_id: null,
    reviewed_at: null,
  },
  {
    _id: "lr2",
    user_id: "u1",
    user_name: "Ava Employee",
    type: "sick",
    status: "approved",
    start_date: "2026-08-10",
    end_date: "2026-08-10",
    days: 1,
    notes: "Flu",
    version: 2,
    updated_at: "2026-08-01T12:10:00.000Z",
    reviewed_by_id: "u2",
    reviewed_at: "2026-08-01T12:10:00.000Z",
  },
  {
    _id: "lr3",
    user_id: "u3",
    user_name: "Sam Employee",
    type: "unpaid",
    status: "pending",
    start_date: "2026-09-05",
    end_date: "2026-09-06",
    days: 2,
    notes: "Personal",
    version: 1,
    updated_at: "2026-08-01T12:20:00.000Z",
    reviewed_by_id: null,
    reviewed_at: null,
  },
];

export async function seedChallenge(db: Db): Promise<void> {
  await db.collection<LeaveUser>("users").insertMany(users);
  await db.collection<LeaveBalance>("leave_balances").insertMany(balances);
  await db.collection<LeaveRequest>("leave_requests").insertMany(requests);
  console.log(
    `[db] seeded ${users.length} users, ${balances.length} balances, ${requests.length} requests`,
  );
}
