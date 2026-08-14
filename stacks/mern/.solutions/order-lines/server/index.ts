import { randomUUID } from "node:crypto";
import type { ChallengeServerModule } from "../../../server/types.ts";
import {
  DRAFT_ORDER_STATUS_OPTIONS,
  type CatalogProduct,
  type DraftOrderLine,
  type DraftOrderRecord,
  type DraftOrderStatus,
  type DraftOrderSummary,
  type OrderOwner,
} from "../../../shared/types.ts";

type OrderDoc = Omit<DraftOrderRecord, "lines">;

function isDraftOrderStatus(value: string): value is DraftOrderStatus {
  return DRAFT_ORDER_STATUS_OPTIONS.includes(value as DraftOrderStatus);
}

const referenceOrderLinesServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    const members = db.collection<OrderOwner>("members");
    const products = db.collection<CatalogProduct>("products");
    const orders = db.collection<OrderDoc>("orders");
    const lines = db.collection<DraftOrderLine>("order_lines");

    async function linesFor(orderId: string): Promise<DraftOrderLine[]> {
      return lines.find({ order_id: orderId }).sort({ _id: 1 }).toArray();
    }

    async function asRecord(order: OrderDoc): Promise<DraftOrderRecord> {
      return { ...order, lines: await linesFor(order._id) };
    }

    async function recomputeTotal(orderId: string): Promise<number> {
      const orderLines = await linesFor(orderId);
      return orderLines.reduce((sum, line) => sum + line.line_total_cents, 0);
    }

    async function listOrders(statusParam: string): Promise<DraftOrderRecord[]> {
      const filter =
        statusParam === "all" ? {} : { status: statusParam as DraftOrderStatus };
      const docs = await orders
        .find(filter)
        .sort({ updated_at: -1 })
        .toArray();
      return Promise.all(docs.map((doc) => asRecord(doc)));
    }

    async function summarize(): Promise<DraftOrderSummary> {
      const [draft, submitted, cancelled] = await Promise.all([
        orders.countDocuments({ status: "draft" }),
        orders.countDocuments({ status: "submitted" }),
        orders.countDocuments({ status: "cancelled" }),
      ]);
      return { draft, submitted, cancelled };
    }

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
        return { ownerId: "", expectedVersion: NaN, ok: false, message: "owner_id is required." };
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

    /**
     * Diagnose a failed / pre-check write. Ordering is the product contract:
     * cancelled → 410 before stale → 412.
     */
    async function diagnoseWrite(
      orderId: string,
      ownerId: string,
      expectedVersion: number,
    ): Promise<{ status: number; body: Record<string, unknown> }> {
      const order = await orders.findOne({ _id: orderId });
      if (!order) {
        return { status: 404, body: { message: "Order not found." } };
      }
      const latest = await asRecord(order);
      if (order.owner_id !== ownerId) {
        return { status: 403, body: { message: "Not the order owner." } };
      }
      if (order.status === "cancelled") {
        return {
          status: 410,
          body: { message: "Order is cancelled.", latest },
        };
      }
      if (order.status !== "draft") {
        return {
          status: 422,
          body: { message: "Order is not editable.", latest },
        };
      }
      if (order.version !== expectedVersion) {
        return {
          status: 412,
          body: { message: "Stale version.", latest },
        };
      }
      return { status: 409, body: { message: "Write conflict.", latest } };
    }

    app.get("/api/products", async (_request, response) => {
      const list = await products.find({}).sort({ name: 1 }).toArray();
      response.json(list);
    });

    app.get("/api/orders/summary", async (_request, response) => {
      response.json(await summarize());
    });

    app.get("/api/orders", async (request, response) => {
      const raw = request.query.status;
      const statusParam =
        raw === undefined || raw === null
          ? "all"
          : String(Array.isArray(raw) ? raw[0] : raw);

      if (statusParam !== "all" && !isDraftOrderStatus(statusParam)) {
        response.status(400).json({ message: "Invalid status." });
        return;
      }

      response.json(await listOrders(statusParam));
    });

    app.get("/api/orders/:id", async (request, response) => {
      const order = await orders.findOne({ _id: request.params.id });
      if (!order) {
        response.status(404).json({ message: "Order not found." });
        return;
      }
      response.json(await asRecord(order));
    });

    app.post("/api/orders/:id/lines", async (request, response) => {
      const orderId = request.params.id;
      const parsed = parseOwnerAndVersion(request.body);
      if (!parsed.ok) {
        response.status(400).json({ message: parsed.message });
        return;
      }

      const productId = String(request.body?.product_id ?? "");
      const quantityRaw = request.body?.quantity;
      const quantity =
        typeof quantityRaw === "number"
          ? quantityRaw
          : Number.parseInt(String(quantityRaw ?? ""), 10);

      if (!productId) {
        response.status(400).json({ message: "product_id is required." });
        return;
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        response.status(400).json({ message: "quantity must be >= 1." });
        return;
      }

      const member = await members.findOne({ _id: parsed.ownerId });
      if (!member) {
        response.status(400).json({ message: "Unknown owner." });
        return;
      }

      const product = await products.findOne({ _id: productId });
      if (!product) {
        response.status(400).json({ message: "Unknown product." });
        return;
      }

      const existingLine = await lines.findOne({
        order_id: orderId,
        product_id: productId,
      });
      if (existingLine) {
        const order = await orders.findOne({ _id: orderId });
        if (!order) {
          response.status(404).json({ message: "Order not found." });
          return;
        }
        response.status(409).json({
          message: "Product already on order.",
          latest: await asRecord(order),
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const claimed = await orders.findOneAndUpdate(
        {
          _id: orderId,
          status: "draft",
          owner_id: parsed.ownerId,
          version: parsed.expectedVersion,
        },
        { $inc: { version: 1 }, $set: { updated_at: nowIso } },
        { returnDocument: "after" },
      );

      if (!claimed) {
        const diagnosed = await diagnoseWrite(
          orderId,
          parsed.ownerId,
          parsed.expectedVersion,
        );
        response.status(diagnosed.status).json(diagnosed.body);
        return;
      }

      const lineTotal = quantity * product.unit_price_cents;
      const line: DraftOrderLine = {
        _id: `ol-${randomUUID().slice(0, 8)}`,
        order_id: orderId,
        product_id: product._id,
        product_name: product.name,
        quantity,
        unit_price_cents: product.unit_price_cents,
        line_total_cents: lineTotal,
      };
      await lines.insertOne(line);

      const total_cents = await recomputeTotal(orderId);
      await orders.updateOne({ _id: orderId }, { $set: { total_cents } });
      const fresh = await orders.findOne({ _id: orderId });
      response.json(await asRecord(fresh!));
    });

    app.patch("/api/orders/:id/lines/:lineId", async (request, response) => {
      const orderId = request.params.id;
      const lineId = request.params.lineId;
      const parsed = parseOwnerAndVersion(request.body);
      if (!parsed.ok) {
        response.status(400).json({ message: parsed.message });
        return;
      }

      const quantityRaw = request.body?.quantity;
      const quantity =
        typeof quantityRaw === "number"
          ? quantityRaw
          : Number.parseInt(String(quantityRaw ?? ""), 10);
      if (!Number.isInteger(quantity) || quantity < 1) {
        response.status(400).json({ message: "quantity must be >= 1." });
        return;
      }

      const line = await lines.findOne({ _id: lineId, order_id: orderId });
      if (!line) {
        const order = await orders.findOne({ _id: orderId });
        if (!order) {
          response.status(404).json({ message: "Order not found." });
          return;
        }
        response.status(404).json({ message: "Line not found." });
        return;
      }

      const nowIso = new Date().toISOString();
      const claimed = await orders.findOneAndUpdate(
        {
          _id: orderId,
          status: "draft",
          owner_id: parsed.ownerId,
          version: parsed.expectedVersion,
        },
        { $inc: { version: 1 }, $set: { updated_at: nowIso } },
        { returnDocument: "after" },
      );

      if (!claimed) {
        const diagnosed = await diagnoseWrite(
          orderId,
          parsed.ownerId,
          parsed.expectedVersion,
        );
        response.status(diagnosed.status).json(diagnosed.body);
        return;
      }

      await lines.updateOne(
        { _id: lineId },
        {
          $set: {
            quantity,
            line_total_cents: quantity * line.unit_price_cents,
          },
        },
      );

      const total_cents = await recomputeTotal(orderId);
      await orders.updateOne({ _id: orderId }, { $set: { total_cents } });
      const fresh = await orders.findOne({ _id: orderId });
      response.json(await asRecord(fresh!));
    });

    app.delete("/api/orders/:id/lines/:lineId", async (request, response) => {
      const orderId = request.params.id;
      const lineId = request.params.lineId;
      const parsed = parseOwnerAndVersion(request.body);
      if (!parsed.ok) {
        response.status(400).json({ message: parsed.message });
        return;
      }

      const line = await lines.findOne({ _id: lineId, order_id: orderId });
      if (!line) {
        const order = await orders.findOne({ _id: orderId });
        if (!order) {
          response.status(404).json({ message: "Order not found." });
          return;
        }
        response.status(404).json({ message: "Line not found." });
        return;
      }

      const nowIso = new Date().toISOString();
      const claimed = await orders.findOneAndUpdate(
        {
          _id: orderId,
          status: "draft",
          owner_id: parsed.ownerId,
          version: parsed.expectedVersion,
        },
        { $inc: { version: 1 }, $set: { updated_at: nowIso } },
        { returnDocument: "after" },
      );

      if (!claimed) {
        const diagnosed = await diagnoseWrite(
          orderId,
          parsed.ownerId,
          parsed.expectedVersion,
        );
        response.status(diagnosed.status).json(diagnosed.body);
        return;
      }

      await lines.deleteOne({ _id: lineId });
      const total_cents = await recomputeTotal(orderId);
      await orders.updateOne({ _id: orderId }, { $set: { total_cents } });
      const fresh = await orders.findOne({ _id: orderId });
      response.json(await asRecord(fresh!));
    });

    app.post("/api/orders/:id/submit", async (request, response) => {
      const orderId = request.params.id;
      const parsed = parseOwnerAndVersion(request.body);
      if (!parsed.ok) {
        response.status(400).json({ message: parsed.message });
        return;
      }

      const nowIso = new Date().toISOString();
      const claimed = await orders.findOneAndUpdate(
        {
          _id: orderId,
          status: "draft",
          owner_id: parsed.ownerId,
          version: parsed.expectedVersion,
        },
        {
          $inc: { version: 1 },
          $set: { status: "submitted", updated_at: nowIso },
        },
        { returnDocument: "after" },
      );

      if (!claimed) {
        const diagnosed = await diagnoseWrite(
          orderId,
          parsed.ownerId,
          parsed.expectedVersion,
        );
        response.status(diagnosed.status).json(diagnosed.body);
        return;
      }

      response.json(await asRecord(claimed));
    });
  },
};

export default referenceOrderLinesServer;
