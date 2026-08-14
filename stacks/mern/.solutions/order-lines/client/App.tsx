import { useEffect, useState } from "react";
import {
  ApiError,
  addOrderLine,
  deleteOrderLine,
  fetchOrderSummary,
  fetchOrders,
  fetchProducts,
  patchOrderLine,
  submitOrder,
} from "./api.ts";
import { CURRENT_OWNER_ID } from "../../../shared/order-lines.ts";
import {
  DRAFT_ORDER_STATUS_OPTIONS,
  type CatalogProduct,
  type DraftOrderRecord,
  type DraftOrderStatus,
  type DraftOrderSummary,
} from "../../../shared/types.ts";

export function ChallengeApp() {
  const [items, setItems] = useState<DraftOrderRecord[]>([]);
  const [summary, setSummary] = useState<DraftOrderSummary | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [statusFilter, setStatusFilter] = useState<DraftOrderStatus | "all">(
    "all",
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftVersion, setDraftVersion] = useState(1);
  const [addProductId, setAddProductId] = useState("");
  const [addQuantity, setAddQuantity] = useState("1");
  const [lineQtyDrafts, setLineQtyDrafts] = useState<Record<string, string>>({});
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [staleMessage, setStaleMessage] = useState<string | null>(null);
  const [goneMessage, setGoneMessage] = useState<string | null>(null);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);

  function clearSignals() {
    setConflictMessage(null);
    setStaleMessage(null);
    setGoneMessage(null);
    setLockedMessage(null);
  }

  async function refreshBoard(
    status: DraftOrderStatus | "all" = statusFilter,
  ) {
    const [nextItems, nextSummary] = await Promise.all([
      fetchOrders(status),
      fetchOrderSummary(),
    ]);
    setItems(nextItems);
    setSummary(nextSummary);
  }

  useEffect(() => {
    void (async () => {
      const catalog = await fetchProducts();
      setProducts(catalog);
      if (catalog[0]) {
        setAddProductId(catalog[0]._id);
      }
      await refreshBoard("all");
    })();
  }, []);

  async function handleStatusChange(next: DraftOrderStatus | "all") {
    setStatusFilter(next);
    clearSignals();
    await refreshBoard(next);
  }

  function handleExpand(order: DraftOrderRecord) {
    setExpandedId((current) => (current === order._id ? null : order._id));
    setEditingId(null);
    clearSignals();
  }

  function handleEdit(order: DraftOrderRecord) {
    setExpandedId(order._id);
    setEditingId(order._id);
    setDraftVersion(order.version);
    setLineQtyDrafts(
      Object.fromEntries(
        order.lines.map((line) => [line._id, String(line.quantity)]),
      ),
    );
    clearSignals();
  }

  async function handleMutationError(error: unknown) {
    if (error instanceof ApiError && error.status === 409) {
      const payload = error.payload as { message?: string };
      setConflictMessage(String(payload.message ?? error.message));
      await refreshBoard();
      return;
    }
    if (error instanceof ApiError && error.status === 412) {
      const payload = error.payload as { message?: string };
      setStaleMessage(String(payload.message ?? error.message));
      await refreshBoard();
      return;
    }
    if (error instanceof ApiError && error.status === 410) {
      const payload = error.payload as { message?: string };
      setGoneMessage(String(payload.message ?? error.message));
      setEditingId(null);
      await refreshBoard();
      return;
    }
    if (error instanceof ApiError && error.status === 422) {
      const payload = error.payload as { message?: string };
      setLockedMessage(String(payload.message ?? error.message));
      await refreshBoard();
      return;
    }
    setStaleMessage(error instanceof Error ? error.message : "Request failed");
  }

  async function handleAddLine(orderId: string) {
    clearSignals();
    try {
      const updated = await addOrderLine(orderId, {
        owner_id: CURRENT_OWNER_ID,
        expected_version: draftVersion,
        product_id: addProductId,
        quantity: Number.parseInt(addQuantity, 10),
      });
      setDraftVersion(updated.version);
      setLineQtyDrafts(
        Object.fromEntries(
          updated.lines.map((line) => [line._id, String(line.quantity)]),
        ),
      );
      await refreshBoard();
    } catch (error) {
      await handleMutationError(error);
    }
  }

  async function handleSaveLine(orderId: string, lineId: string) {
    clearSignals();
    try {
      const quantity = Number.parseInt(lineQtyDrafts[lineId] ?? "1", 10);
      const updated = await patchOrderLine(orderId, lineId, {
        owner_id: CURRENT_OWNER_ID,
        expected_version: draftVersion,
        quantity,
      });
      setDraftVersion(updated.version);
      await refreshBoard();
    } catch (error) {
      await handleMutationError(error);
    }
  }

  async function handleRemoveLine(orderId: string, lineId: string) {
    clearSignals();
    try {
      const updated = await deleteOrderLine(orderId, lineId, {
        owner_id: CURRENT_OWNER_ID,
        expected_version: draftVersion,
      });
      setDraftVersion(updated.version);
      await refreshBoard();
    } catch (error) {
      await handleMutationError(error);
    }
  }

  async function handleSubmit(orderId: string) {
    clearSignals();
    try {
      await submitOrder(orderId, {
        owner_id: CURRENT_OWNER_ID,
        expected_version: draftVersion,
      });
      setEditingId(null);
      await refreshBoard();
    } catch (error) {
      await handleMutationError(error);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
            Order Lines
          </p>
          <h1 className="text-3xl font-semibold">Draft order desk</h1>
        </header>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase text-slate-400">Draft</p>
            <p data-testid="summary-draft" className="text-2xl font-semibold">
              {summary?.draft ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase text-slate-400">Submitted</p>
            <p
              data-testid="summary-submitted"
              className="text-2xl font-semibold"
            >
              {summary?.submitted ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase text-slate-400">Cancelled</p>
            <p
              data-testid="summary-cancelled"
              className="text-2xl font-semibold"
            >
              {summary?.cancelled ?? "—"}
            </p>
          </div>
        </div>

        {conflictMessage ? (
          <p
            data-testid="conflict-message"
            className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-2 text-amber-100"
          >
            {conflictMessage}
          </p>
        ) : null}
        {staleMessage ? (
          <p
            data-testid="stale-message"
            className="rounded-lg border border-orange-700/50 bg-orange-950/40 px-3 py-2 text-orange-100"
          >
            {staleMessage}
          </p>
        ) : null}
        {goneMessage ? (
          <p
            data-testid="gone-message"
            className="rounded-lg border border-rose-700/50 bg-rose-950/40 px-3 py-2 text-rose-100"
          >
            {goneMessage}
          </p>
        ) : null}
        {lockedMessage ? (
          <p
            data-testid="locked-message"
            className="rounded-lg border border-fuchsia-700/50 bg-fuchsia-950/40 px-3 py-2 text-fuchsia-100"
          >
            {lockedMessage}
          </p>
        ) : null}

        <label className="flex max-w-xs flex-col gap-1 text-sm">
          <span className="text-slate-400">Status filter</span>
          <select
            aria-label="Status filter"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={statusFilter}
            onChange={(event) =>
              void handleStatusChange(
                event.target.value as DraftOrderStatus | "all",
              )
            }
          >
            <option value="all">all</option>
            {DRAFT_ORDER_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <ul data-testid="order-list" className="space-y-3">
          {items.map((order) => {
            const expanded = expandedId === order._id;
            const editing = editingId === order._id;
            return (
              <li
                key={order._id}
                data-testid={`${order._id}-order-row`}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p
                      data-testid={`${order._id}-order-customer`}
                      className="text-lg font-medium"
                    >
                      {order.customer_name}
                    </p>
                    <p data-testid={`${order._id}-order-status`}>
                      {order.status}
                    </p>
                    <p data-testid={`${order._id}-order-total`}>
                      {order.total_cents}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm"
                      onClick={() => handleExpand(order)}
                    >
                      Expand
                    </button>
                    {order.status === "draft" &&
                    order.owner_id === CURRENT_OWNER_ID ? (
                      <button
                        type="button"
                        className="rounded-lg border border-sky-600 px-3 py-1.5 text-sm text-sky-100"
                        onClick={() => handleEdit(order)}
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>
                </div>

                {expanded && !editing ? (
                  <div
                    data-testid={`${order._id}-details-view`}
                    className="mt-4 space-y-2 border-t border-slate-800 pt-4 text-sm text-slate-300"
                  >
                    <p>Notes: {order.notes || "—"}</p>
                    <p data-testid={`${order._id}-version`}>
                      Version {order.version}
                    </p>
                    <ul className="space-y-1">
                      {order.lines.map((line) => (
                        <li key={line._id}>
                          {line.product_name} × {line.quantity} ={" "}
                          {line.line_total_cents}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {editing ? (
                  <form
                    data-testid={`${order._id}-details-form`}
                    className="mt-4 space-y-3 border-t border-slate-800 pt-4"
                    onSubmit={(event) => event.preventDefault()}
                  >
                    <p data-testid={`${order._id}-version`}>
                      Version {draftVersion}
                    </p>

                    <div className="flex flex-wrap items-end gap-2">
                      <label className="flex flex-col gap-1 text-sm">
                        <span>Product</span>
                        <select
                          aria-label={`${order._id}-add-product`}
                          data-testid={`${order._id}-add-product`}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5"
                          value={addProductId}
                          onChange={(event) =>
                            setAddProductId(event.target.value)
                          }
                        >
                          {products.map((product) => (
                            <option key={product._id} value={product._id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span>Qty</span>
                        <input
                          aria-label={`${order._id}-add-quantity`}
                          data-testid={`${order._id}-add-quantity`}
                          className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5"
                          value={addQuantity}
                          onChange={(event) =>
                            setAddQuantity(event.target.value)
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm"
                        onClick={() => void handleAddLine(order._id)}
                      >
                        Add line
                      </button>
                    </div>

                    <ul className="space-y-2">
                      {order.lines.map((line) => (
                        <li
                          key={line._id}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <span className="min-w-24">{line.product_name}</span>
                          <input
                            aria-label={`${order._id}-line-${line._id}-quantity`}
                            data-testid={`${order._id}-line-${line._id}-quantity`}
                            className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5"
                            value={lineQtyDrafts[line._id] ?? String(line.quantity)}
                            onChange={(event) =>
                              setLineQtyDrafts((current) => ({
                                ...current,
                                [line._id]: event.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="rounded-lg border border-slate-600 px-2 py-1 text-sm"
                            onClick={() =>
                              void handleSaveLine(order._id, line._id)
                            }
                          >
                            Save line
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-rose-700 px-2 py-1 text-sm text-rose-100"
                            onClick={() =>
                              void handleRemoveLine(order._id, line._id)
                            }
                          >
                            Remove line
                          </button>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm"
                      onClick={() => void handleSubmit(order._id)}
                    >
                      Submit order
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
