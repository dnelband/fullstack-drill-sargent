import { ObjectId } from "mongodb";
import type { ChallengeServerModule } from "../../../../server/types.ts";
import {
  DEFAULT_ANNUAL_DAYS,
  DEFAULT_SICK_DAYS,
  LEAVE_TYPE_OPTIONS,
  LeaveType,
} from "@shared/types.ts";
import { inclusiveLeaveDays } from "@shared/leave-desk.ts";
import { LeaveRequest } from "../../../../shared/types";
import { O } from "vitest/dist/chunks/reporters.d.BuRON0I0.js";

const isLeaveType = (type: LeaveType) => LEAVE_TYPE_OPTIONS.includes(type);
const isValidDate = (date: string) => {
  console.log(date, " DATE");
  const dateFragments = date.split("-");
  if (dateFragments.length !== 3) return false;
  const year = dateFragments[0];
  if (year.length !== 4 || Number.isNaN(year)) return false;
  const month = dateFragments[1];
  if (month.length !== 2 || Number.isNaN(month)) return false;
  const day = dateFragments[2];
  if (day.length !== 2 || Number.isNaN(day)) return false;
  return true;
};

const exerciseLeaveDeskServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    // Implement /api/users, /api/leave-balance, /api/leave-requests,
    // PATCH, approve, and reject. See challenge README.
    // Overlap → 409 + conflicting_request. Versioned writes use {_id, version}.
    void app;
    void db;
    app.get("/api/users", async (_req, res) => {
      try {
        const users = await db
          .collection("users")
          .find()
          .sort({ display_name: 1 })
          .toArray();
        return res.status(200).json(users);
      } catch (error) {
        return res.status(500).json({ message: "Error fetching users", error });
      }
    });
    app.get("/api/leave-balance", async (req, res) => {
      const { user_id } = req.query;

      const userId = user_id as string;

      if (!userId) {
        return res.status(400).json({ message: "Invalid User Id" });
      }

      const user = await db
        .collection("users")
        .findOne({ _id: user_id as unknown as ObjectId });

      if (!user) {
        return res.status(404).json({ message: "User Not Found" });
      }

      try {
        const userLeaveBalance = await db
          .collection("leave_balances")
          .findOne({ user_id });
        return res
          .status(200)
          .json(userLeaveBalance ?? { user_id, annual_days: 0, sick_days: 0 });
      } catch (error) {
        return res.status(500).json({
          message: `Error fetching Leave Balance for userId: ${userId}`,
        });
      }
    });
    app.get("/api/leave-requests", async (req, res) => {
      const { status, user_id } = req.query;

      const filters = {
        ...(status ? { status } : null),
        ...(user_id ? { user_id } : null),
      };

      try {
        const leaveRequests = await db
          .collection("leave_requests")
          .find(filters)
          .sort({ start_date: 1 })
          .toArray();
        return res.status(200).json(leaveRequests);
      } catch (error) {
        return res
          .status(500)
          .json({ message: "Error fetching Leave Requests", error });
      }
    });
    app.post("/api/leave-requests", async (req, res) => {
      const userId = String(req.body?.user_id ?? "");
      const type = req.body?.type;
      const startDate = String(req.body?.start_date ?? "");
      const endDate = String(req.body?.end_date ?? "");
      const notes = String(req.body?.notes ?? "");

      if (!userId) {
        return res.status(400).json({ message: "User Id is Required" });
      }

      if (!isLeaveType(type)) {
        return res.status(400).json({ message: "Invalid leave type" });
      }

      // validate fields
      if (!isValidDate(startDate)) {
        return res.status(400).json({ message: "Invalid Start Date!" });
        // TODO: field specific error logging
      }

      // validate fields
      if (!isValidDate(endDate)) {
        return res.status(400).json({ message: "Invalid End Date!" });
        // TODO: field specific error logging
      }

      const user = await db
        .collection("users")
        .findOne({ _id: userId as unknown as ObjectId });

      if (!user) {
        return res.status(400).json({ message: "User Not Found" });
      }

      //TODO: if this is not unpdaid, is there enough balance?
      const days = inclusiveLeaveDays(startDate, endDate);
      if (type !== "unpaid") {
        const userLeaveBalance = await db
          .collection("leave_balances")
          .find({ user_id: userId })
          .toArray();
        const balanceProperty = type === "annual" ? "annual_days" : "sick_days";
        const defaultTotal =
          type === "annual" ? DEFAULT_ANNUAL_DAYS : DEFAULT_SICK_DAYS;
        let totalAvailableDays = userLeaveBalance
          ? (userLeaveBalance[balanceProperty as any] as unknown as number)
          : defaultTotal;
        if (days > totalAvailableDays) {
          return res.status(422).json({ message: "Not enough days left" });
        }
      }

      const conflictingRequest = await db.collection("leave_requests").findOne({
        start_date: {
          $lte: endDate,
          $gte: startDate,
        },
        end_date: {
          $gte: startDate,
          $lte: endDate,
        },
      });
      if (conflictingRequest) {
        return res.status(409).json({
          message: "CLeave dates overlap an existing request.",
          conflicting_request: conflictingRequest,
        });
      }

      try {
        const leaveRequestResult = await db
          .collection("leave_requests")
          .insertOne({
            user_id: user._id,
            user_name: user.display_name,
            type,
            status: "pending",
            start_date: startDate,
            end_date: endDate,
            days,
            notes,
            version: 1,
            updatedAt: new Date(Date.now()).toISOString(),
            reviewed_by_id: null,
            reviewed_at: null,
          });
        const LeaveRequest = await db
          .collection("leave_requests")
          .findOne({ _id: leaveRequestResult.insertedId });
        return res.status(200).json(LeaveRequest);
      } catch (error) {
        return res
          .status(500)
          .json({ message: "Error creating leavel request", error });
      }
    });
    app.patch("/api/leave-requests/:id", async (req, res) => {
      const { id } = req.params;
      const { expected_version, start_date, end_date, type, notes } = req.body;

      const leaveRequestId = id;

      if (!leaveRequestId) {
        return res.status(400).json({ message: "Invalid User Id" });
      }

      const leaveRequest = await db
        .collection("leave_requests")
        .findOneAndUpdate(
          {
            _id: leaveRequestId as unknown as ObjectId,
            status: "pending",
            version: expected_version,
          },
          {
            $set: {
              status: "approved",
            },
            $inc: {
              version: 1,
            },
          },
          {
            returnDocument: "after",
          },
        );

      if (!leaveRequest) {
        const leaveRequestExists = await db
          .collection("leave_requests")
          .findOne({ _d: leaveRequestId as unknown as ObjectId });
        if (!leaveRequestExists)
          return res.status(404).json({ message: "Leave Requests not found" });
        return res.status(412).json({
          message: "Leave Request is no longer pending",
          latest: {
            ...leaveRequestExists,
            start_date,
            end_date,
            notes,
            type,
          },
        });
      }

      return res.status(200).json({ ...leaveRequest, expected_version });
    });
  },
};

export default exerciseLeaveDeskServer;
export { exerciseLeaveDeskServer };
