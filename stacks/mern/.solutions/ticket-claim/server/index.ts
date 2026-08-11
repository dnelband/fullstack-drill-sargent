import type { Filter } from "mongodb";
import type { ChallengeServerModule } from "../../../server/types.ts";
import type {
  TicketMember,
  TicketRecord,
  TicketStatus,
  TicketSummary,
} from "../../../shared/types.ts";
import { TICKET_STATUS_OPTIONS } from "../../../shared/types.ts";

function isTicketStatus(value: string): value is TicketStatus {
  return TICKET_STATUS_OPTIONS.includes(value as TicketStatus);
}

const referenceTicketClaimServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    const tickets = db.collection<TicketRecord>("tickets");
    const members = db.collection<TicketMember>("members");

    app.get("/api/tickets/summary", async (_request, response) => {
      const all = await tickets.find({}).toArray();
      const summary: TicketSummary = { open: 0, claimed: 0 };
      for (const ticket of all) {
        summary[ticket.status] += 1;
      }
      response.json(summary);
    });

    app.get("/api/tickets", async (request, response) => {
      const raw = request.query.status;
      const statusParam =
        raw === undefined || raw === null
          ? "all"
          : String(Array.isArray(raw) ? raw[0] : raw);

      if (statusParam !== "all" && !isTicketStatus(statusParam)) {
        response.status(400).json({ message: "Invalid status." });
        return;
      }

      const filter: Filter<TicketRecord> =
        statusParam === "all" ? {} : { status: statusParam };

      const list = await tickets.find(filter).sort({ created_at: -1 }).toArray();
      response.json(list);
    });

    app.post("/api/tickets/:id/claim", async (request, response) => {
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

      const updated = await tickets.findOneAndUpdate(
        { _id: id, status: "open" },
        {
          $set: {
            status: "claimed",
            claimed_by_id: memberId,
            claimed_by_name: member.display_name,
          },
        },
        { returnDocument: "after" },
      );

      if (updated) {
        response.json(updated);
        return;
      }

      const latest = await tickets.findOne({ _id: id });
      if (!latest) {
        response.status(404).json({ message: "Ticket not found." });
        return;
      }

      response.status(409).json({
        message: "Ticket is no longer open.",
        latest,
      });
    });
  },
};

export default referenceTicketClaimServer;
export { referenceTicketClaimServer };
