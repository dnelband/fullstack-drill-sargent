import type { ChallengeServerModule } from "../../../server/types.ts";
import {
  MEMO_STATUS_OPTIONS,
  type MemoMember,
  type MemoRecord,
  type MemoStatus,
  type MemoSummary,
} from "../../../shared/types.ts";

function isMemoStatus(value: string): value is MemoStatus {
  return MEMO_STATUS_OPTIONS.includes(value as MemoStatus);
}

const referenceMemoDeskServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    const members = db.collection<MemoMember>("members");
    const memos = db.collection<MemoRecord>("memos");

    function parseOwnerAndVersion(body: unknown): {
      ownerId: string;
      expectedVersion: number;
      ok: boolean;
      message?: string;
    } {
      const record = body as Record<string, unknown> | null;
      const ownerId = String(record?.owner_id ?? "");
      const rawVersion = record?.expected_version;
      const expectedVersion =
        typeof rawVersion === "number"
          ? rawVersion
          : Number.parseInt(String(rawVersion ?? ""), 10);
      if (!ownerId) {
        return {
          ownerId: "",
          expectedVersion: NaN,
          ok: false,
          message: "owner_id is required.",
        };
      }
      if (!Number.isInteger(expectedVersion)) {
        return {
          ownerId,
          expectedVersion: NaN,
          ok: false,
          message: "expected_version is required.",
        };
      }
      return { ownerId, expectedVersion, ok: true };
    }

    async function diagnoseWrite(
      memoId: string,
      ownerId: string,
      expectedVersion: number,
    ): Promise<{ status: number; body: Record<string, unknown> }> {
      const memo = await memos.findOne({ _id: memoId });
      if (!memo) {
        return { status: 404, body: { message: "Memo not found." } };
      }
      if (memo.owner_id !== ownerId) {
        return { status: 403, body: { message: "Not the memo owner." } };
      }
      if (memo.status === "archived") {
        return {
          status: 410,
          body: { message: "Memo is archived.", latest: memo },
        };
      }
      if (memo.version !== expectedVersion) {
        return {
          status: 412,
          body: { message: "Stale version.", latest: memo },
        };
      }
      return { status: 409, body: { message: "Write conflict.", latest: memo } };
    }

    app.get("/api/memos/summary", async (_request, response) => {
      const [active, archived] = await Promise.all([
        memos.countDocuments({ status: "active" }),
        memos.countDocuments({ status: "archived" }),
      ]);
      const summary: MemoSummary = { active, archived };
      response.json(summary);
    });

    app.get("/api/memos", async (request, response) => {
      const raw = request.query.status;
      const statusParam =
        raw === undefined || raw === null
          ? "all"
          : String(Array.isArray(raw) ? raw[0] : raw);

      if (statusParam !== "all" && !isMemoStatus(statusParam)) {
        response.status(400).json({ message: "Invalid status." });
        return;
      }

      const filter =
        statusParam === "all" ? {} : { status: statusParam as MemoStatus };
      const list = await memos.find(filter).sort({ updated_at: -1 }).toArray();
      response.json(list);
    });

    app.patch("/api/memos/:id", async (request, response) => {
      const memoId = request.params.id;
      const parsed = parseOwnerAndVersion(request.body);
      if (!parsed.ok) {
        response.status(400).json({ message: parsed.message });
        return;
      }

      if (typeof request.body?.body !== "string") {
        response.status(400).json({ message: "body is required." });
        return;
      }

      const member = await members.findOne({ _id: parsed.ownerId });
      if (!member) {
        response.status(400).json({ message: "Unknown owner." });
        return;
      }

      const nowIso = new Date().toISOString();
      const updated = await memos.findOneAndUpdate(
        {
          _id: memoId,
          status: "active",
          owner_id: parsed.ownerId,
          version: parsed.expectedVersion,
        },
        {
          $inc: { version: 1 },
          $set: { body: request.body.body, updated_at: nowIso },
        },
        { returnDocument: "after" },
      );

      if (!updated) {
        const diagnosed = await diagnoseWrite(
          memoId,
          parsed.ownerId,
          parsed.expectedVersion,
        );
        response.status(diagnosed.status).json(diagnosed.body);
        return;
      }

      response.json(updated);
    });

    app.post("/api/memos/:id/archive", async (request, response) => {
      const memoId = request.params.id;
      const parsed = parseOwnerAndVersion(request.body);
      if (!parsed.ok) {
        response.status(400).json({ message: parsed.message });
        return;
      }

      const member = await members.findOne({ _id: parsed.ownerId });
      if (!member) {
        response.status(400).json({ message: "Unknown owner." });
        return;
      }

      const nowIso = new Date().toISOString();
      const updated = await memos.findOneAndUpdate(
        {
          _id: memoId,
          status: "active",
          owner_id: parsed.ownerId,
          version: parsed.expectedVersion,
        },
        {
          $inc: { version: 1 },
          $set: { status: "archived", updated_at: nowIso },
        },
        { returnDocument: "after" },
      );

      if (!updated) {
        const diagnosed = await diagnoseWrite(
          memoId,
          parsed.ownerId,
          parsed.expectedVersion,
        );
        response.status(diagnosed.status).json(diagnosed.body);
        return;
      }

      response.json(updated);
    });
  },
};

export default referenceMemoDeskServer;
