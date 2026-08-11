import type { ChallengeServerModule } from "../../../server/types.ts";
import { ORDER_STATUSES } from "../../../shared/orders-inbox.ts";
import type { OrderRecord, OrderStatus, OrderSummary } from "../../../shared/types.ts";

function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}

const referenceOrdersInboxServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    const orders = db.collection<OrderRecord>("orders");

    app.get("/api/orders/summary", async (_request, response) => {
      const all = await orders.find({}).toArray();
      const summary: OrderSummary = {
        open: 0,
        paid: 0,
        shipped: 0,
        cancelled: 0,
        total_cents: 0,
      };
      for (const order of all) {
        summary[order.status] += 1;
        summary.total_cents += order.total_cents;
      }
      response.json(summary);
    });

    app.get("/api/orders", async (request, response) => {
      const raw = request.query.status;
      const statusParam =
        raw === undefined || raw === null ? "all" : String(Array.isArray(raw) ? raw[0] : raw);

      if (statusParam !== "all" && !isOrderStatus(statusParam)) {
        response.status(400).json({ message: "Invalid status." });
        return;
      }

      const filter = statusParam === "all" ? {} : { status: statusParam };

      const list = await orders.find(filter).sort({ created_at: -1 }).toArray();
      response.json(list);
    });
  },
};

export default referenceOrdersInboxServer;
export { referenceOrdersInboxServer };
