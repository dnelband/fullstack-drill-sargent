export type DraftOrderStatus = "draft" | "submitted" | "cancelled";

export const DRAFT_ORDER_STATUS_OPTIONS: DraftOrderStatus[] = [
  "draft",
  "submitted",
  "cancelled",
];

export interface OrderOwner {
  _id: string;
  display_name: string;
}

/** Catalog row — read-only for this desk. */
export interface CatalogProduct {
  _id: string;
  name: string;
  unit_price_cents: number;
}

export interface DraftOrderLine {
  _id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  /** Snapshot of catalog price at add time. */
  unit_price_cents: number;
  line_total_cents: number;
}

export interface DraftOrderRecord {
  _id: string;
  customer_name: string;
  status: DraftOrderStatus;
  owner_id: string;
  owner_name: string;
  /** Server-owned sum of line_total_cents. */
  total_cents: number;
  notes: string;
  version: number;
  updated_at: string;
  lines: DraftOrderLine[];
}

export interface DraftOrderSummary {
  draft: number;
  submitted: number;
  cancelled: number;
}

export interface AddOrderLineInput {
  owner_id: string;
  expected_version: number;
  product_id: string;
  quantity: number;
}

export interface PatchOrderLineInput {
  owner_id: string;
  expected_version: number;
  quantity: number;
}

export interface DeleteOrderLineInput {
  owner_id: string;
  expected_version: number;
}

export interface SubmitOrderInput {
  owner_id: string;
  expected_version: number;
}
