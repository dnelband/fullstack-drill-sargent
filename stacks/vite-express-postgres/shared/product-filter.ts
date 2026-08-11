import type { ComponentType } from "react";

export interface ProductFilterChallengeModule {
  ChallengeApp: ComponentType;
}

export const FILTER_KEYS = ["brand", "discount", "stock"] as const;
export const DISCOUNT_OPERATORS = ["greater_than", "less_than", "equal"] as const;
export const STOCK_OPERATORS = ["in_stock", "out_of_stock"] as const;

export const challengeTasks = [
  "[API] POST /api/products/query with empty filters returns products ordered by name",
  "[API] brand contains filter is case-insensitive",
  "[API] discount greater_than filter returns matching products",
  "[API] stock in_stock filter returns only products with stock > 0",
  "[API] combined filters apply as intersection",
  "[API] invalid filter returns 400",
  "[UI] The product list loads on first render",
  "[UI] Brand filter updates the list",
  "[UI] Discount filter updates the list",
  "[UI] Stock filter updates the list",
] as const;
