import type { Db } from "mongodb";
import type {
  CatalogProduct,
  DraftOrderLine,
  DraftOrderRecord,
  OrderOwner,
} from "../exercise/types.ts";

const members: OrderOwner[] = [
  { _id: "m1", display_name: "Ava Owner" },
  { _id: "m2", display_name: "Ben Owner" },
];

const products: CatalogProduct[] = [
  { _id: "p1", name: "Widget", unit_price_cents: 1000 },
  { _id: "p2", name: "Gadget", unit_price_cents: 2500 },
  { _id: "p3", name: "Cable", unit_price_cents: 500 },
];

/** Stored without embedded `lines` — API assembles DraftOrderRecord. */
type OrderDoc = Omit<DraftOrderRecord, "lines">;

const orders: OrderDoc[] = [
  {
    _id: "o1",
    customer_name: "Northwind",
    status: "draft",
    owner_id: "m1",
    owner_name: "Ava Owner",
    total_cents: 4500,
    notes: "Rush if possible",
    version: 1,
    updated_at: "2026-08-13T10:00:00.000Z",
  },
  {
    _id: "o2",
    customer_name: "Acme",
    status: "submitted",
    owner_id: "m1",
    owner_name: "Ava Owner",
    total_cents: 1000,
    notes: "",
    version: 2,
    updated_at: "2026-08-12T10:00:00.000Z",
  },
  {
    _id: "o3",
    customer_name: "Globex",
    status: "cancelled",
    owner_id: "m1",
    owner_name: "Ava Owner",
    total_cents: 500,
    notes: "Customer withdrew",
    version: 2,
    updated_at: "2026-08-11T10:00:00.000Z",
  },
  {
    _id: "o4",
    customer_name: "Initech",
    status: "draft",
    owner_id: "m2",
    owner_name: "Ben Owner",
    total_cents: 0,
    notes: "",
    version: 1,
    updated_at: "2026-08-10T10:00:00.000Z",
  },
];

const lines: DraftOrderLine[] = [
  {
    _id: "ol1",
    order_id: "o1",
    product_id: "p1",
    product_name: "Widget",
    quantity: 2,
    unit_price_cents: 1000,
    line_total_cents: 2000,
  },
  {
    _id: "ol2",
    order_id: "o1",
    product_id: "p2",
    product_name: "Gadget",
    quantity: 1,
    unit_price_cents: 2500,
    line_total_cents: 2500,
  },
  {
    _id: "ol3",
    order_id: "o2",
    product_id: "p1",
    product_name: "Widget",
    quantity: 1,
    unit_price_cents: 1000,
    line_total_cents: 1000,
  },
  {
    _id: "ol4",
    order_id: "o3",
    product_id: "p3",
    product_name: "Cable",
    quantity: 1,
    unit_price_cents: 500,
    line_total_cents: 500,
  },
];

export async function seedChallenge(db: Db): Promise<void> {
  await db.collection("members").deleteMany({});
  await db.collection("products").deleteMany({});
  await db.collection("orders").deleteMany({});
  await db.collection("order_lines").deleteMany({});

  await db.collection<OrderOwner>("members").insertMany(members);
  await db.collection<CatalogProduct>("products").insertMany(products);
  await db.collection<OrderDoc>("orders").insertMany(orders);
  await db.collection<DraftOrderLine>("order_lines").insertMany(lines);

  console.log(
    `[db] seeded ${members.length} members, ${products.length} products, ${orders.length} orders, ${lines.length} lines`,
  );
}
