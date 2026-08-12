import type { Filter } from "mongodb";
import type { ChallengeServerModule } from "../../../server/types.ts";
import { HOLD_TTL_MS } from "../../../shared/hold-queue.ts";
import {
  HOLD_QUEUE_STATUS_OPTIONS,
  type HoldQueueItem,
  type HoldQueueMember,
  type HoldQueueStatus,
  type HoldQueueSummary,
} from "../../../shared/types.ts";

function isHoldQueueStatus(value: string): value is HoldQueueStatus {
  return HOLD_QUEUE_STATUS_OPTIONS.includes(value as HoldQueueStatus);
}

function isActivelyHeld(item: HoldQueueItem, nowMs: number): boolean {
  if (item.status !== "held" || !item.held_until) {
    return false;
  }
  return Date.parse(item.held_until) > nowMs;
}

function effectiveStatus(item: HoldQueueItem, nowMs: number): HoldQueueStatus {
  return isActivelyHeld(item, nowMs) ? "held" : "open";
}

const referenceHoldQueueServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    const items = db.collection<HoldQueueItem>("queue_items");
    const members = db.collection<HoldQueueMember>("members");

    async function listEffective(statusParam: string) {
      const nowMs = Date.now();
      const all = await items.find({}).sort({ created_at: -1 }).toArray();
      if (statusParam === "all") {
        return all;
      }
      return all.filter((item) => effectiveStatus(item, nowMs) === statusParam);
    }

    async function summarize(): Promise<HoldQueueSummary> {
      const nowMs = Date.now();
      const all = await items.find({}).toArray();
      const summary: HoldQueueSummary = { open: 0, held: 0 };
      for (const item of all) {
        summary[effectiveStatus(item, nowMs)] += 1;
      }
      return summary;
    }

    app.get("/api/queue/summary", async (_request, response) => {
      response.json(await summarize());
    });

    app.get("/api/queue", async (request, response) => {
      const raw = request.query.status;
      const statusParam =
        raw === undefined || raw === null
          ? "all"
          : String(Array.isArray(raw) ? raw[0] : raw);

      if (statusParam !== "all" && !isHoldQueueStatus(statusParam)) {
        response.status(400).json({ message: "Invalid status." });
        return;
      }

      response.json(await listEffective(statusParam));
    });

    app.post("/api/queue/:id/hold", async (request, response) => {
      const id = request.params.id;
      const memberId = String(request.body?.member_id ?? "");
      if (!memberId) {
        response.status(400).json({ message: "member_id is required." });
        return;
      }

      const member = await members.findOne({ _id: memberId });
      if (!member) {
        response.status(400).json({ message: "Unknown member." });
        return;
      }

      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const heldUntil = new Date(nowMs + HOLD_TTL_MS).toISOString();

      const availableFilter: Filter<HoldQueueItem> = {
        _id: id,
        $or: [
          { status: "open" },
          { status: "held", held_until: { $lte: nowIso } },
          { status: "held", held_until: null },
        ],
      };

      const updated = await items.findOneAndUpdate(
        availableFilter,
        {
          $set: {
            status: "held",
            held_by_id: memberId,
            held_by_name: member.display_name,
            held_until: heldUntil,
          },
          $inc: { version: 1 },
        },
        { returnDocument: "after" },
      );

      if (updated) {
        response.json(updated);
        return;
      }

      const latest = await items.findOne({ _id: id });
      if (!latest) {
        response.status(404).json({ message: "Item not found." });
        return;
      }

      response.status(409).json({
        message: "Item is actively held.",
        latest,
      });
    });

    app.patch("/api/queue/:id", async (request, response) => {
      const id = request.params.id;
      const memberId = String(request.body?.member_id ?? "");
      const notes = request.body?.notes;
      const expectedVersion = Number(request.body?.expected_version);

      if (!memberId) {
        response.status(400).json({ message: "member_id is required." });
        return;
      }
      if (typeof notes !== "string") {
        response.status(400).json({ message: "notes is required." });
        return;
      }
      if (!Number.isFinite(expectedVersion)) {
        response.status(400).json({ message: "expected_version is required." });
        return;
      }

      const nowIso = new Date().toISOString();

      const updated = await items.findOneAndUpdate(
        {
          _id: id,
          status: "held",
          held_by_id: memberId,
          held_until: { $gt: nowIso },
          version: expectedVersion,
        },
        {
          $set: { notes },
          $inc: { version: 1 },
        },
        { returnDocument: "after" },
      );

      if (updated) {
        response.json(updated);
        return;
      }

      const latest = await items.findOne({ _id: id });
      if (!latest) {
        response.status(404).json({ message: "Item not found." });
        return;
      }

      const nowMs = Date.now();
      if (!isActivelyHeld(latest, nowMs)) {
        response.status(410).json({
          message: "Hold has expired.",
          latest,
        });
        return;
      }

      if (latest.held_by_id !== memberId) {
        response.status(403).json({
          message: "Hold belongs to another member.",
          latest,
        });
        return;
      }

      response.status(412).json({
        message: "Your copy is stale.",
        latest,
      });
    });
  },
};

export default referenceHoldQueueServer;
export { referenceHoldQueueServer };
