import type { Filter } from "mongodb";
import type { ChallengeServerModule } from "../../../server/types.ts";
import { SEAT_HOLD_TTL_MS } from "../../../shared/seat-hold.ts";
import {
  SEAT_STATUS_OPTIONS,
  type SeatMember,
  type SeatRecord,
  type SeatStatus,
  type SeatSummary,
} from "../../../shared/types.ts";

function isSeatStatus(value: string): value is SeatStatus {
  return SEAT_STATUS_OPTIONS.includes(value as SeatStatus);
}

function isActivelyHeld(seat: SeatRecord, nowMs: number): boolean {
  if (seat.status !== "held" || !seat.held_until) {
    return false;
  }
  return Date.parse(seat.held_until) > nowMs;
}

function effectiveStatus(seat: SeatRecord, nowMs: number): SeatStatus {
  return isActivelyHeld(seat, nowMs) ? "held" : "open";
}

const referenceSeatHoldServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    const seats = db.collection<SeatRecord>("seats");
    const members = db.collection<SeatMember>("members");

    async function listEffective(statusParam: string) {
      const nowMs = Date.now();
      const all = await seats
        .find({})
        .sort({ section: 1, label: 1 })
        .toArray();
      if (statusParam === "all") {
        return all;
      }
      return all.filter((seat) => effectiveStatus(seat, nowMs) === statusParam);
    }

    async function summarize(): Promise<SeatSummary> {
      const nowMs = Date.now();
      const all = await seats.find({}).toArray();
      const summary: SeatSummary = { open: 0, held: 0 };
      for (const seat of all) {
        summary[effectiveStatus(seat, nowMs)] += 1;
      }
      return summary;
    }

    app.get("/api/seats/summary", async (_request, response) => {
      response.json(await summarize());
    });

    app.get("/api/seats", async (request, response) => {
      const raw = request.query.status;
      const statusParam =
        raw === undefined || raw === null
          ? "all"
          : String(Array.isArray(raw) ? raw[0] : raw);

      if (statusParam !== "all" && !isSeatStatus(statusParam)) {
        response.status(400).json({ message: "Invalid status." });
        return;
      }

      response.json(await listEffective(statusParam));
    });

    app.post("/api/seats/:id/hold", async (request, response) => {
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
      const heldUntil = new Date(nowMs + SEAT_HOLD_TTL_MS).toISOString();

      const availableFilter: Filter<SeatRecord> = {
        _id: id,
        $or: [
          { status: "open" },
          { status: "held", held_until: { $lte: nowIso } },
          { status: "held", held_until: null },
        ],
      };

      const updated = await seats.findOneAndUpdate(
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

      const latest = await seats.findOne({ _id: id });
      if (!latest) {
        response.status(404).json({ message: "Seat not found." });
        return;
      }

      response.status(409).json({
        message: "Seat is actively held.",
        latest,
      });
    });

    app.patch("/api/seats/:id", async (request, response) => {
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

      const updated = await seats.findOneAndUpdate(
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

      const latest = await seats.findOne({ _id: id });
      if (!latest) {
        response.status(404).json({ message: "Seat not found." });
        return;
      }

      const nowMs = Date.now();
      if (!isActivelyHeld(latest, nowMs) || latest.held_by_id !== memberId) {
        if (!isActivelyHeld(latest, nowMs)) {
          response.status(410).json({
            message: "Hold has expired.",
            latest,
          });
          return;
        }
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

export default referenceSeatHoldServer;
export { referenceSeatHoldServer };
