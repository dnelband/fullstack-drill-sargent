export type ProductFilterKey = "brand" | "discount" | "stock";
export type DiscountOperator = "greater_than" | "less_than" | "equal";
export type StockOperator = "in_stock" | "out_of_stock";

export interface ProductRecord {
  id: string;
  name: string;
  brand: string;
  discount_percent: number;
  stock: number;
}

export type ProductFilter =
  | { key: "brand"; operator: "contains"; value: string }
  | { key: "discount"; operator: DiscountOperator; value: number }
  | { key: "stock"; operator: StockOperator };

export const VALID_DISCOUNT_OPERATORS: DiscountOperator[] = [
  "equal",
  "greater_than",
  "less_than",
];

export const VALID_STOCK_OPERATOR: StockOperator[] = [
  "in_stock",
  "out_of_stock",
];

export const VALID_OPERATORS: Array<
  "contains" | DiscountOperator | StockOperator
> = [...VALID_DISCOUNT_OPERATORS, ...VALID_STOCK_OPERATOR, "contains"];

export interface ProductQueryInput {
  filters: ProductFilter[];
}
