import { useEffect, useState, type FormEvent } from "react";
import { queryProducts } from "./api.ts";
import type {
  DiscountOperator,
  ProductFilter,
  ProductRecord,
  StockOperator,
} from "../../../shared/types.ts";

const DISCOUNT_OPS: DiscountOperator[] = ["greater_than", "less_than", "equal"];

export function ChallengeApp() {
  const [items, setItems] = useState<ProductRecord[]>([]);
  const [brand, setBrand] = useState("");
  const [discountOp, setDiscountOp] = useState<DiscountOperator | "">("");
  const [discountValue, setDiscountValue] = useState("");
  const [stockOp, setStockOp] = useState<StockOperator | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function runQuery(filters: ProductFilter[]) {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await queryProducts(filters));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void runQuery([]);
  }, []);

  function buildFilters(): ProductFilter[] {
    const filters: ProductFilter[] = [];
    const brandTrimmed = brand.trim();
    if (brandTrimmed) {
      filters.push({ key: "brand", operator: "contains", value: brandTrimmed });
    }
    if (discountOp && discountValue !== "") {
      const value = Number(discountValue);
      if (Number.isFinite(value)) {
        filters.push({ key: "discount", operator: discountOp, value });
      }
    }
    if (stockOp) {
      filters.push({ key: "stock", operator: stockOp });
    }
    return filters;
  }

  function handleApply(event: FormEvent) {
    event.preventDefault();
    void runQuery(buildFilters());
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
            Product Filter Desk
          </p>
          <h1 className="text-3xl font-semibold">Stackable catalog filters</h1>
          <p className="text-sm text-slate-400">
            Brand, discount, and stock — intersection from the API.
          </p>
        </header>

        <form
          onSubmit={handleApply}
          className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:grid-cols-2"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Brand filter</span>
            <input
              aria-label="Brand filter"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Stock filter</span>
            <select
              aria-label="Stock filter"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              value={stockOp}
              onChange={(event) =>
                setStockOp(event.target.value as StockOperator | "")
              }
            >
              <option value="">any</option>
              <option value="in_stock">in_stock</option>
              <option value="out_of_stock">out_of_stock</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Discount operator</span>
            <select
              aria-label="Discount operator"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              value={discountOp}
              onChange={(event) =>
                setDiscountOp(event.target.value as DiscountOperator | "")
              }
            >
              <option value="">any</option>
              {DISCOUNT_OPS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Discount value</span>
            <input
              aria-label="Discount value"
              type="number"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              value={discountValue}
              onChange={(event) => setDiscountValue(event.target.value)}
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500"
            >
              Apply filters
            </button>
          </div>
        </form>

        {error && (
          <p className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-medium">
            {isLoading ? "Loading…" : `Products (${items.length})`}
          </h2>
          <ul data-testid="product-list" className="space-y-3">
            {items.map((item) => (
              <li
                key={item._id}
                data-testid={`${item._id}-product-row`}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
              >
                <p data-testid={`${item._id}-product-name`} className="font-medium">
                  {item.name}
                </p>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-300">
                  <span data-testid={`${item._id}-product-brand`}>{item.brand}</span>
                  <span data-testid={`${item._id}-product-discount`}>
                    {item.discount_percent}%
                  </span>
                  <span data-testid={`${item._id}-product-stock`}>
                    stock {item.stock}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
