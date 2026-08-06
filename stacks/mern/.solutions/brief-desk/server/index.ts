import type { ChallengeServerModule } from "../../../server/types.ts";
import type { BriefRecord, BriefSummary, Member } from "../../../shared/types.ts";

type BriefDoc = {
  _id: string;
  client_name: string;
  title: string;
  priority: BriefRecord["priority"];
  status: BriefRecord["status"];
  assigned_member_id: string | null;
  due_at: string;
  notes: string;
  version: number;
  updated_at: string;
};

type MemberDoc = {
  _id: string;
  display_name: string;
  discipline: string;
};

const PRIORITY_ORDER: Record<BriefRecord["priority"], number> = {
  high: 1,
  medium: 2,
  low: 3,
};

function mapMember(doc: MemberDoc): Member {
  return {
    _id: doc._id,
    display_name: doc.display_name,
    discipline: doc.discipline,
  };
}

function mapBrief(doc: BriefDoc, memberName: string | null): BriefRecord {
  return {
    _id: doc._id,
    client_name: doc.client_name,
    title: doc.title,
    priority: doc.priority,
    status: doc.status,
    assigned_member_id: doc.assigned_member_id,
    assigned_member_name: memberName,
    due_at: new Date(doc.due_at).toISOString(),
    notes: doc.notes,
    version: doc.version,
    updated_at: new Date(doc.updated_at).toISOString(),
  };
}

async function resolveMemberName(
  db: { collection: (name: string) => { findOne: (filter: object) => Promise<MemberDoc | null> } },
  memberId: string | null,
): Promise<string | null> {
  if (!memberId) {
    return null;
  }
  const member = await db.collection("members").findOne({ _id: memberId });
  return member?.display_name ?? null;
}

async function getSummary(db: {
  collection: (name: string) => {
    aggregate: (pipeline: object[]) => { toArray: () => Promise<Array<Record<string, number>>> };
  };
}): Promise<BriefSummary> {
  const rows = await db
    .collection("briefs")
    .aggregate([
      {
        $group: {
          _id: null,
          open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
          claimed: { $sum: { $cond: [{ $eq: ["$status", "claimed"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        },
      },
    ])
    .toArray();

  const row = rows[0] ?? {};
  return {
    open: Number(row.open ?? 0),
    claimed: Number(row.claimed ?? 0),
    completed: Number(row.completed ?? 0),
  };
}

const referenceBriefDeskServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    const members = db.collection<MemberDoc>("members");
    const briefs = db.collection<BriefDoc>("briefs");

    app.get("/api/members", async (_request, response) => {
      const docs = await members.find({}).sort({ display_name: 1 }).toArray();
      response.json(docs.map(mapMember));
    });

    app.get("/api/summary", async (_request, response) => {
      response.json(await getSummary(db));
    });

    app.get("/api/briefs", async (request, response) => {
      const status =
        typeof request.query.status === "string" ? request.query.status : "open";
      const assignedMemberId =
        typeof request.query.assigned_member_id === "string"
          ? request.query.assigned_member_id
          : undefined;
      const search =
        typeof request.query.search === "string" ? request.query.search.trim() : undefined;

      const filter: Record<string, unknown> = {};
      if (status && status !== "all") {
        filter.status = status;
      }
      if (assignedMemberId && assignedMemberId !== "all") {
        filter.assigned_member_id = assignedMemberId;
      }
      if (search) {
        const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = [
          { client_name: { $regex: pattern, $options: "i" } },
          { title: { $regex: pattern, $options: "i" } },
        ];
      }

      const docs = await briefs.find(filter).toArray();
      docs.sort((a, b) => {
        const priorityDelta = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      });

      const memberIds = [
        ...new Set(docs.map((doc) => doc.assigned_member_id).filter(Boolean)),
      ] as string[];
      const memberDocs = memberIds.length
        ? await members.find({ _id: { $in: memberIds } }).toArray()
        : [];
      const names = new Map(memberDocs.map((doc) => [doc._id, doc.display_name]));

      response.json(
        docs.map((doc) => mapBrief(doc, doc.assigned_member_id ? names.get(doc.assigned_member_id) ?? null : null)),
      );
    });

    app.post("/api/briefs/:id/claim", async (request, response) => {
      const briefId = String(request.params.id);
      const memberId = String(request.body.member_id ?? "");

      if (!memberId) {
        response.status(400).json({ message: "missing member id" });
        return;
      }

      const member = await members.findOne({ _id: memberId });
      if (!member) {
        response.status(404).json({ message: "Member not found" });
        return;
      }

      const updated = await briefs.findOneAndUpdate(
        { _id: briefId, status: "open" },
        {
          $set: {
            status: "claimed",
            assigned_member_id: memberId,
            updated_at: new Date().toISOString(),
          },
          $inc: { version: 1 },
        },
        { returnDocument: "after" },
      );

      if (!updated) {
        response.status(409).json({ message: "Brief is no longer open." });
        return;
      }

      response.json(mapBrief(updated, member.display_name));
    });

    app.patch("/api/briefs/:id", async (request, response) => {
      const briefId = String(request.params.id);
      const expectedVersion = Number(request.body.expected_version);
      const status = String(request.body.status) as BriefRecord["status"];
      const notes = String(request.body.notes ?? "");

      const updated = await briefs.findOneAndUpdate(
        { _id: briefId, version: expectedVersion },
        {
          $set: {
            status,
            notes,
            updated_at: new Date().toISOString(),
          },
          $inc: { version: 1 },
        },
        { returnDocument: "after" },
      );

      if (!updated) {
        const latestDoc = await briefs.findOne({ _id: briefId });
        response.status(409).json({
          message: "Your copy is stale. Refresh with the latest brief data.",
          latest: latestDoc
            ? mapBrief(latestDoc, await resolveMemberName(db, latestDoc.assigned_member_id))
            : null,
        });
        return;
      }

      response.json(
        mapBrief(updated, await resolveMemberName(db, updated.assigned_member_id)),
      );
    });
  },
};

export default referenceBriefDeskServer;
export { referenceBriefDeskServer };
