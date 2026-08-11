export type OrderStatus = "open" | "paid" | "shipped" | "cancelled";

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  "open",
  "paid",
  "shipped",
  "cancelled",
];

export interface OrderRecord {
  _id: string;
  customer_name: string;
  status: OrderStatus;
  total_cents: number;
  created_at: string;
  notes: string;
}

export interface OrderSummary {
  open: number;
  paid: number;
  shipped: number;
  cancelled: number;
  total_cents: number;
}
