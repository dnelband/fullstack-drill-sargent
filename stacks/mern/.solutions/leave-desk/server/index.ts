import { randomUUID } from "node:crypto";
import type { ChallengeServerModule } from "../../../server/types.ts";
import { datesOverlap, inclusiveLeaveDays } from "../../../shared/leave-desk.ts";
import type {
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  LeaveUser,
} from "../../../shared/types.ts";

const LEAVE_TYPES: LeaveType[] = ["annual", "sick", "unpaid"];

function isLeaveType(value: unknown): value is LeaveType {
  return typeof value === "string" && LEAVE_TYPES.includes(value as LeaveType);
}

const referenceLeaveDeskServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    const users = db.collection<LeaveUser>("users");
    const balances = db.collection<LeaveBalance>("leave_balances");
    const requests = db.collection<LeaveRequest>("leave_requests");

    async function findRequest(id: string) {
      return requests.findOne({ _id: id });
    }

    async function findOverlap(
      userId: string,
      startDate: string,
      endDate: string,
      excludeId?: string,
    ) {
      const candidates = await requests
        .find({
          user_id: userId,
          status: { $in: ["pending", "approved"] },
          ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        })
        .toArray();
      return (
        candidates.find((item) =>
          datesOverlap(startDate, endDate, item.start_date, item.end_date),
        ) ?? null
      );
    }

    app.get("/api/users", async (_request, response) => {
      const list = await users.find({}).sort({ display_name: 1 }).toArray();
      response.json(list);
    });

    app.get("/api/leave-balance", async (request, response) => {
      const userId = String(request.query.user_id ?? "");
      if (!userId) {
        response.status(400).json({ message: "user_id is required." });
        return;
      }

      const user = await users.findOne({ _id: userId });
      if (!user) {
        response.status(404).json({ message: "User not found." });
        return;
      }

      const balance = await balances.findOne({ user_id: userId });
      response.json(
        balance ?? {
          _id: `bal-${userId}`,
          user_id: userId,
          annual_days: 0,
          sick_days: 0,
        },
      );
    });

    app.get("/api/leave-requests", async (request, response) => {
      const filter: Record<string, unknown> = {};
      const status = String(request.query.status ?? "all");
      const type = String(request.query.type ?? "all");
      const userId = String(request.query.user_id ?? "");

      if (status && status !== "all") {
        filter.status = status;
      }
      if (type && type !== "all") {
        filter.type = type;
      }
      if (userId) {
        filter.user_id = userId;
      }

      const list = await requests
        .find(filter)
        .sort({ start_date: 1, _id: 1 })
        .toArray();
      response.json(list);
    });

    app.post("/api/leave-requests", async (request, response) => {
      const userId = String(request.body?.user_id ?? "");
      const type = request.body?.type;
      const startDate = String(request.body?.start_date ?? "");
      const endDate = String(request.body?.end_date ?? "");
      const notes = String(request.body?.notes ?? "");

      if (!userId || !isLeaveType(type) || !startDate || !endDate) {
        response.status(400).json({ message: "Invalid leave request." });
        return;
      }

      const days = inclusiveLeaveDays(startDate, endDate);
      if (days < 1) {
        response.status(400).json({ message: "Invalid leave dates." });
        return;
      }

      const user = await users.findOne({ _id: userId });
      if (!user) {
        response.status(404).json({ message: "User not found." });
        return;
      }

      const conflicting = await findOverlap(userId, startDate, endDate);
      if (conflicting) {
        response.status(409).json({
          message: "Leave dates overlap an existing request.",
          conflicting_request: conflicting,
        });
        return;
      }

      const now = new Date().toISOString();
      const created: LeaveRequest = {
        _id: `lr-${randomUUID()}`,
        user_id: userId,
        user_name: user.display_name,
        type,
        status: "pending",
        start_date: startDate,
        end_date: endDate,
        days,
        notes,
        version: 1,
        updated_at: now,
        reviewed_by_id: null,
        reviewed_at: null,
      };

      await requests.insertOne(created);
      response.json(created);
    });

    app.patch("/api/leave-requests/:id", async (request, response) => {
      const id = request.params.id;
      const expectedVersion = Number(request.body?.expected_version);
      const type = request.body?.type;
      const startDate = String(request.body?.start_date ?? "");
      const endDate = String(request.body?.end_date ?? "");
      const notes = String(request.body?.notes ?? "");

      if (!Number.isFinite(expectedVersion) || !isLeaveType(type) || !startDate || !endDate) {
        response.status(400).json({ message: "Invalid leave update." });
        return;
      }

      const days = inclusiveLeaveDays(startDate, endDate);
      if (days < 1) {
        response.status(400).json({ message: "Invalid leave dates." });
        return;
      }

      const current = await findRequest(id);
      if (!current) {
        response.status(404).json({ message: "Leave request not found." });
        return;
      }

      if (current.status !== "pending") {
        response.status(422).json({
          message: "Leave request is not pending.",
          latest: current,
        });
        return;
      }

      const conflicting = await findOverlap(current.user_id, startDate, endDate, id);
      if (conflicting) {
        response.status(409).json({
          message: "Leave dates overlap an existing request.",
          conflicting_request: conflicting,
        });
        return;
      }

      const updatedAt = new Date().toISOString();
      const updated = await requests.findOneAndUpdate(
        { _id: id, version: expectedVersion, status: "pending" },
        {
          $set: {
            type,
            start_date: startDate,
            end_date: endDate,
            days,
            notes,
            updated_at: updatedAt,
          },
          $inc: { version: 1 },
        },
        { returnDocument: "after" },
      );

      if (!updated) {
        const latest = await findRequest(id);
        if (!latest) {
          response.status(404).json({ message: "Leave request not found." });
          return;
        }
        if (latest.status !== "pending") {
          response.status(422).json({
            message: "Leave request is not pending.",
            latest,
          });
          return;
        }
        response.status(412).json({
          message: "Leave request was updated elsewhere.",
          latest,
        });
        return;
      }

      response.json(updated);
    });

    app.post("/api/leave-requests/:id/approve", async (request, response) => {
      const id = request.params.id;
      const expectedVersion = Number(request.body?.expected_version);
      const reviewerId = String(request.body?.reviewer_id ?? "");

      if (!Number.isFinite(expectedVersion) || !reviewerId) {
        response.status(400).json({ message: "Invalid approve request." });
        return;
      }

      const reviewer = await users.findOne({ _id: reviewerId, role: "manager" });
      if (!reviewer) {
        response.status(403).json({ message: "Reviewer must be a manager." });
        return;
      }

      const current = await findRequest(id);
      if (!current) {
        response.status(404).json({ message: "Leave request not found." });
        return;
      }

      if (current.status !== "pending") {
        response.status(422).json({
          message: "Leave request is not pending.",
          latest: current,
        });
        return;
      }

      if (current.version !== expectedVersion) {
        response.status(412).json({
          message: "Leave request was updated elsewhere.",
          latest: current,
        });
        return;
      }

      if (current.type === "annual" || current.type === "sick") {
        const field = current.type === "annual" ? "annual_days" : "sick_days";
        const balance = await balances.findOne({ user_id: current.user_id });
        if (!balance || balance[field] < current.days) {
          response.status(422).json({
            message: "Insufficient leave balance.",
            latest: current,
          });
          return;
        }

        const deducted = await balances.findOneAndUpdate(
          { user_id: current.user_id, [field]: { $gte: current.days } },
          { $inc: { [field]: -current.days } },
          { returnDocument: "after" },
        );
        if (!deducted) {
          response.status(422).json({
            message: "Insufficient leave balance.",
            latest: current,
          });
          return;
        }
      }

      const reviewedAt = new Date().toISOString();
      const updated = await requests.findOneAndUpdate(
        { _id: id, version: expectedVersion, status: "pending" },
        {
          $set: {
            status: "approved",
            reviewed_by_id: reviewerId,
            reviewed_at: reviewedAt,
            updated_at: reviewedAt,
          },
          $inc: { version: 1 },
        },
        { returnDocument: "after" },
      );

      if (!updated) {
        // Roll back balance if we deducted but lost the race
        if (current.type === "annual" || current.type === "sick") {
          const field = current.type === "annual" ? "annual_days" : "sick_days";
          await balances.updateOne(
            { user_id: current.user_id },
            { $inc: { [field]: current.days } },
          );
        }
        const latest = await findRequest(id);
        if (!latest) {
          response.status(404).json({ message: "Leave request not found." });
          return;
        }
        if (latest.status !== "pending") {
          response.status(422).json({
            message: "Leave request is not pending.",
            latest,
          });
          return;
        }
        response.status(412).json({
          message: "Leave request was updated elsewhere.",
          latest,
        });
        return;
      }

      response.json(updated);
    });

    app.post("/api/leave-requests/:id/reject", async (request, response) => {
      const id = request.params.id;
      const expectedVersion = Number(request.body?.expected_version);
      const reviewerId = String(request.body?.reviewer_id ?? "");

      if (!Number.isFinite(expectedVersion) || !reviewerId) {
        response.status(400).json({ message: "Invalid reject request." });
        return;
      }

      const reviewer = await users.findOne({ _id: reviewerId, role: "manager" });
      if (!reviewer) {
        response.status(403).json({ message: "Reviewer must be a manager." });
        return;
      }

      const reviewedAt = new Date().toISOString();
      const updated = await requests.findOneAndUpdate(
        { _id: id, version: expectedVersion, status: "pending" },
        {
          $set: {
            status: "rejected",
            reviewed_by_id: reviewerId,
            reviewed_at: reviewedAt,
            updated_at: reviewedAt,
          },
          $inc: { version: 1 },
        },
        { returnDocument: "after" },
      );

      if (!updated) {
        const latest = await findRequest(id);
        if (!latest) {
          response.status(404).json({ message: "Leave request not found." });
          return;
        }
        if (latest.status !== "pending") {
          response.status(422).json({
            message: "Leave request is not pending.",
            latest,
          });
          return;
        }
        response.status(412).json({
          message: "Leave request was updated elsewhere.",
          latest,
        });
        return;
      }

      response.json(updated);
    });
  },
};

export default referenceLeaveDeskServer;
export { referenceLeaveDeskServer };
