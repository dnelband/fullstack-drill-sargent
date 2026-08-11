import type { ComponentType } from "react";
import type { OrderStatus } from "./types.ts";

export interface OrdersInboxChallengeModule {
  ChallengeApp: ComponentType;
}

export const ORDER_STATUSES: OrderStatus[] = [
  "open",
  "paid",
  "shipped",
  "cancelled",
];

export const challengeTasks = [
  "[API] GET /api/orders returns orders ordered by created_at desc",
  "[API] GET /api/orders filters by status",
  "[API] GET /api/orders returns 400 for an invalid status",
  "[API] GET /api/orders/summary returns status counts and total_cents",
  "[UI] The order list and summary load on first render",
  "[UI] Status filter updates the list",
  "[UI] Expanding an order shows read-only details without a form",
  "[UI] List rows expose customer, status, and total tiles",
] as const;
