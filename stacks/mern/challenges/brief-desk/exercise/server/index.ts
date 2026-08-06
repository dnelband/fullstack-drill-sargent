import { BriefRecord, BriefSummary, Member } from "@shared/types.ts";
import type { ChallengeServerModule } from "../../../../server/types.ts";
import { ObjectId } from "mongodb";

const exerciseBriefDeskServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    // Implement /api/members, /api/summary, /api/briefs, claim, and patch.
    // Use the native MongoDB driver on `db` (no Mongoose).
    void app;
    void db;
    app.get("/api/summary", async (req, res) => {
      try {
        const result = await db
          .collection<BriefRecord>("briefs")
          .aggregate([
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        const open = result!.find((count) => count._id === "open")?.count ?? 0;
        const claimed =
          result!.find((count) => count._id === "claimed")?.count ?? 0;
        const completed =
          result!.find((count) => count._id === "completed")?.count ?? 0;

        return res.status(200).json({
          open,
          claimed,
          completed,
        });
      } catch (error) {
        return res
          .status(500)
          .json({ message: "Failed fetching summary", error });
      }
    });
    app.get("/api/members", async (req, res) => {
      try {
        const result = await db
          .collection<Member>("members")
          .find()
          .sort({ display_name: 1 })
          .toArray();
        return res.status(200).json(result);
      } catch (error) {
        return res
          .status(500)
          .json({ message: "Error fetching members", error });
      }
    });
    app.get("/api/briefs", async (req, res) => {
      const { status, assigned_member_id, search } = req.query;
      const filter = {
        ...(status !== "all" ? { status: status ?? "open" } : null),
        ...(assigned_member_id && assigned_member_id !== "all"
          ? { assigned_member_id }
          : null),
        ...(search
          ? {
              $or: [
                { client_name: { $regex: search, $options: "i" } },
                { title: { $regex: search, $options: "i" } },
                { notes: { $regex: search, $options: "i" } },
              ],
            }
          : null),
      };

      try {
        const result = await db
          .collection<BriefRecord>("briefs")
          .aggregate([
            {
              $match: filter,
            },
            {
              $lookup: {
                from: "members",
                localField: "assigned_member_id",
                foreignField: "_id",
                as: "assignee",
              },
            },
            {
              $addFields: {
                priorityRank: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$priority", "high"] }, then: 1 },
                      { case: { $eq: ["$priority", "medium"] }, then: 2 },
                      { case: { $eq: ["$priority", "low"] }, then: 3 },
                    ],
                    default: 4,
                  },
                },
              },
            },
            {
              $addFields: {
                assigned_member_name: {
                  $ifNull: [
                    { $arrayElemAt: ["$assignee.display_name", 0] },
                    null,
                  ],
                },
              },
            },
            {
              $sort: {
                priorityRank: 1,
                due_at: 1,
              },
            },
            {
              $project: {
                priorityRank: 0,
              },
            },
          ])
          .toArray();
        return res.status(200).json(result);
      } catch (error) {
        return res
          .status(500)
          .json({ message: "Error fetching briefs", error });
      }
    });
    app.post("/api/briefs/:id/claim", async (req, res) => {
      const { id } = req.params;
      const { member_id } = req.body;

      const currentBrief = await db
        .collection<BriefRecord>("briefs")
        .findOne({ _id: id });

      if (!currentBrief) {
        return res.status(404).json({ message: "Brief not found" });
      }

      if (currentBrief.status !== "open") {
        return res.status(409).json({ message: "Brief is no longer open." });
      }

      const member = await db
        .collection<Member>("members")
        .findOne({ _id: member_id });

      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      try {
        const updatedBrief = await db
          .collection<BriefRecord>("briefs")
          .findOneAndUpdate(
            { _id: currentBrief._id, status: "open" },
            {
              $set: {
                status: "claimed",
                assigned_member_id: member_id,
                updated_at: new Date().toISOString(),
              },
              $inc: {
                version: 1,
              },
            },
            {
              returnDocument: "after",
            },
          );

        if (!updatedBrief) {
          return res.status(409).json({ message: "Brief is no longer open." });
        }

        return res.status(200).json({
          ...updatedBrief,
          assigned_member_name: member?.display_name,
        });
      } catch (error) {
        return res.status(500).json({ message: "Error claiming brief", error });
      }
    });
    app.patch("/api/briefs/:id", async (req, res) => {
      const { id } = req.params;
      const { expected_version, notes, status } = req.body;

      const currentBrief = await db
        .collection<BriefRecord>("briefs")
        .findOne({ _id: id });

      if (!currentBrief) {
        return res.status(404).json({ message: "Brief not found" });
      }

      if (expected_version !== currentBrief.version) {
        return res.status(409).json({
          message: "Your copy is stale. Refresh with the latest brief data.",
          latest: currentBrief,
        });
      }

      try {
        const updatedBrief = await db
          .collection<BriefRecord>("briefs")
          .findOneAndUpdate(
            { _id: currentBrief._id },
            {
              $set: {
                notes,
                status,
                updated_at: new Date().toISOString(),
              },
              $inc: {
                version: 1,
              },
            },
            {
              returnDocument: "after",
            },
          );

        return res.status(200).json(updatedBrief);
      } catch (error) {
        return res.status(500).json({ message: "Error updating brief", error });
      }
    });
  },
};

export default exerciseBriefDeskServer;
export { exerciseBriefDeskServer };
