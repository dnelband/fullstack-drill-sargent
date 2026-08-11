import { useEffect, useState } from "react";
import { fetchOrderSummary, fetchOrders } from "./api.ts";
import { ORDER_STATUSES } from "../../../shared/orders-inbox.ts";
import type { OrderRecord, OrderStatus, OrderSummary } from "../../../shared/types.ts";

export function ChallengeApp() {
  const [items, setItems] = useState<OrderRecord[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadSummary() {
    setSummary(await fetchOrderSummary());
  }

  async function loadOrders(status: OrderStatus | "all") {
    setItems(await fetchOrders(status));
  }

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    void Promise.all([loadSummary(), loadOrders("all")])
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Load failed");
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleStatusChange(next: OrderStatus | "all") {
    setStatusFilter(next);
    setExpandedId(null);
    setError(null);
    try {
      await loadOrders(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Filter failed");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-amber-300">Orders Inbox</p>
          <h1 className="text-3xl font-semibold">Filter and inspect orders</h1>
          <p className="text-sm text-slate-400">
            Global summary, status filter, expand for read-only details.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-xs uppercase text-slate-400">Open</p>
            <p data-testid="summary-open" className="text-xl font-semibold">
              {summary?.open ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-xs uppercase text-slate-400">Paid</p>
            <p data-testid="summary-paid" className="text-xl font-semibold">
              {summary?.paid ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-xs uppercase text-slate-400">Shipped</p>
            <p data-testid="summary-shipped" className="text-xl font-semibold">
              {summary?.shipped ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-xs uppercase text-slate-400">Cancelled</p>
            <p data-testid="summary-cancelled" className="text-xl font-semibold">
              {summary?.cancelled ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-xs uppercase text-slate-400">Total ¢</p>
            <p data-testid="summary-total-cents" className="text-xl font-semibold">
              {summary?.total_cents ?? "—"}
            </p>
          </div>
        </div>

        <label className="flex max-w-xs flex-col gap-1 text-sm">
          <span className="text-slate-400">Status filter</span>
          <select
            aria-label="Status filter"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={statusFilter}
            onChange={(event) =>
              void handleStatusChange(event.target.value as OrderStatus | "all")
            }
          >
            <option value="all">all</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-medium">
            {isLoading ? "Loading…" : `Orders (${items.length})`}
          </h2>
          <ul data-testid="order-list" className="space-y-3">
            {items.map((item) => {
              const isExpanded = expandedId === item._id;
              return (
                <li
                  key={item._id}
                  data-testid={`${item._id}-order-row`}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p
                        data-testid={`${item._id}-order-customer`}
                        className="font-medium"
                      >
                        {item.customer_name}
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                        <span data-testid={`${item._id}-order-status`}>
                          {item.status}
                        </span>
                        <span data-testid={`${item._id}-order-total`}>
                          {item.total_cents}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : item._id)
                      }
                    >
                      Expand
                    </button>
                  </div>

                  {isExpanded && (
                    <div
                      data-testid={`${item._id}-details-view`}
                      className="mt-4 space-y-1 border-t border-slate-800 pt-4 text-sm text-slate-300"
                    >
                      <p>Notes: {item.notes || "—"}</p>
                      <p>Created: {item.created_at}</p>
                      <p>Total cents: {item.total_cents}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
