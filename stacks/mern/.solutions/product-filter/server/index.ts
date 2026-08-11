import type { ChallengeServerModule } from "../../../server/types.ts";
import type {
  DiscountOperator,
  ProductFilter,
  ProductRecord,
  StockOperator,
} from "../../../shared/types.ts";

const DISCOUNT_OPS: DiscountOperator[] = ["greater_than", "less_than", "equal"];
const STOCK_OPS: StockOperator[] = ["in_stock", "out_of_stock"];

function isDiscountOperator(value: unknown): value is DiscountOperator {
  return typeof value === "string" && DISCOUNT_OPS.includes(value as DiscountOperator);
}

function isStockOperator(value: unknown): value is StockOperator {
  return typeof value === "string" && STOCK_OPS.includes(value as StockOperator);
}

function parseFilters(raw: unknown): { ok: true; filters: ProductFilter[] } | { ok: false } {
  if (!Array.isArray(raw)) {
    return { ok: false };
  }

  const filters: ProductFilter[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      return { ok: false };
    }
    const key = (item as { key?: unknown }).key;
    const operator = (item as { operator?: unknown }).operator;
    const value = (item as { value?: unknown }).value;

    if (key === "brand") {
      if (operator !== "contains" || typeof value !== "string") {
        return { ok: false };
      }
      filters.push({ key: "brand", operator: "contains", value });
      continue;
    }

    if (key === "discount") {
      if (!isDiscountOperator(operator) || typeof value !== "number" || !Number.isFinite(value)) {
        return { ok: false };
      }
      filters.push({ key: "discount", operator, value });
      continue;
    }

    if (key === "stock") {
      if (!isStockOperator(operator)) {
        return { ok: false };
      }
      filters.push({ key: "stock", operator });
      continue;
    }

    return { ok: false };
  }

  return { ok: true, filters };
}

function matches(product: ProductRecord, filter: ProductFilter): boolean {
  if (filter.key === "brand") {
    return product.brand.toLowerCase().includes(filter.value.toLowerCase());
  }
  if (filter.key === "discount") {
    if (filter.operator === "greater_than") {
      return product.discount_percent > filter.value;
    }
    if (filter.operator === "less_than") {
      return product.discount_percent < filter.value;
    }
    return product.discount_percent === filter.value;
  }
  return filter.operator === "in_stock" ? product.stock > 0 : product.stock <= 0;
}

const referenceProductFilterServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    const products = db.collection<ProductRecord>("products");

    app.post("/api/products/query", async (request, response) => {
      const parsed = parseFilters(request.body?.filters);
      if (!parsed.ok) {
        response.status(400).json({ message: "Invalid filters." });
        return;
      }

      const list = await products.find({}).sort({ name: 1 }).toArray();
      const filtered = list.filter((product) =>
        parsed.filters.every((filter) => matches(product, filter)),
      );
      response.json(filtered);
    });
  },
};

export default referenceProductFilterServer;
export { referenceProductFilterServer };
