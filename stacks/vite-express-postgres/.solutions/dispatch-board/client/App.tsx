import { useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  claimCallback,
  fetchAgents,
  fetchCallbacks,
  fetchSummary,
  updateCallback,
} from "./api.ts";
import type {
  Agent,
  CallbackFilters,
  CallbackRecord,
  CallbackStatus,
  CallbackSummary,
} from "../../../shared/types.ts";

const emptySummary: CallbackSummary = { open: 0, claimed: 0, completed: 0 };

function readFiltersFromUrl(): CallbackFilters {
  const params = new URLSearchParams(window.location.search);
  return {
    status: (params.get("status") as CallbackStatus | "all" | null) ?? "open",
    assigned_agent_id: params.get("assigned_agent_id") ?? "all",
    search: params.get("search") ?? "",
  };
}

function writeFiltersToUrl(filters: CallbackFilters) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.assigned_agent_id && filters.assigned_agent_id !== "all") {
    params.set("assigned_agent_id", filters.assigned_agent_id);
  }
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  const query = params.toString();
  const nextUrl = query ? `?${query}` : window.location.pathname;
  window.history.replaceState({}, "", nextUrl);
}

function upsertCallback(items: CallbackRecord[], nextItem: CallbackRecord) {
  const index = items.findIndex((item) => item.id === nextItem.id);
  if (index === -1) {
    return items;
  }

  const copy = [...items];
  copy[index] = nextItem;
  return copy;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
      data-testid={`summary-${label.toLowerCase()}`}
    >
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export function ChallengeApp() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filters, setFilters] = useState<CallbackFilters>(() => readFiltersFromUrl());
  const [items, setItems] = useState<CallbackRecord[]>([]);
  const [summary, setSummary] = useState<CallbackSummary>(emptySummary);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<CallbackStatus>("claimed");
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const latestRequestRef = useRef(0);

  const expandedCallback = useMemo(
    () => items.find((item) => item.id === expandedId) ?? null,
    [items, expandedId],
  );

  useEffect(() => {
    void fetchAgents().then(setAgents);
  }, []);

  useEffect(() => {
    writeFiltersToUrl(filters);
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    const controller = new AbortController();

    setIsLoading(true);
    setListError(null);
    setConflictMessage(null);

    void Promise.all([fetchCallbacks(filters, controller.signal), fetchSummary()])
      .then(([nextItems, nextSummary]) => {
        if (latestRequestRef.current !== requestId) {
          return;
        }

        setItems(nextItems);
        setSummary(nextSummary);
        setExpandedId((current) => {
          if (current && nextItems.some((item) => item.id === current)) {
            return current;
          }
          return null;
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || latestRequestRef.current !== requestId) {
          return;
        }

        setListError(error instanceof Error ? error.message : "Failed to load callbacks.");
      })
      .finally(() => {
        if (latestRequestRef.current === requestId) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [filters]);

  useEffect(() => {
    if (!expandedCallback) {
      setNotesDraft("");
      setStatusDraft("claimed");
      return;
    }

    setNotesDraft(expandedCallback.notes);
    setStatusDraft(
      expandedCallback.status === "open" ? "claimed" : expandedCallback.status,
    );
  }, [expandedCallback]);

  async function refreshSummary() {
    setSummary(await fetchSummary());
  }

  async function handleClaim(callback: CallbackRecord) {
    setIsMutating(true);
    setConflictMessage(null);

    try {
      const claimed = await claimCallback(callback.id, {
        agent_id: agents[0]?.id ?? "a1",
      });
      const statusFilter = filters.status ?? "open";
      const stillMatchesFilter = statusFilter === "all" || claimed.status === statusFilter;

      setItems((current) => {
        if (!stillMatchesFilter) {
          return current.filter((item) => item.id !== claimed.id);
        }
        return upsertCallback(current, claimed);
      });
      if (!stillMatchesFilter) {
        setExpandedId(null);
        setEditingId(null);
      } else {
        setExpandedId(claimed.id);
        setEditingId(null);
      }
      await refreshSummary();
    } catch (error: unknown) {
      setConflictMessage(error instanceof Error ? error.message : "Failed to claim callback.");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleSave(callback: CallbackRecord) {
    setIsMutating(true);
    setConflictMessage(null);

    try {
      const updated = await updateCallback(callback.id, {
        expected_version: callback.version,
        status: statusDraft,
        notes: notesDraft,
      });
      setItems((current) => upsertCallback(current, updated));
      setExpandedId(updated.id);
      setEditingId(updated.id);
      await refreshSummary();
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        const payload = error.payload as { latest?: CallbackRecord };
        const latest = payload.latest;
        if (latest) {
          setItems((current) => upsertCallback(current, latest));
          setExpandedId(latest.id);
          setEditingId(latest.id);
        }
      }

      setConflictMessage(error instanceof Error ? error.message : "Failed to update callback.");
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Dispatch Board</p>
          <h1 className="text-3xl font-semibold">Callback operations workspace</h1>
          <p className="max-w-3xl text-sm text-slate-400">
            Claim callbacks, keep notes current, and handle stale writes without losing the latest
            server state.
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <SummaryCard label="Open" value={summary.open} />
          <SummaryCard label="Claimed" value={summary.claimed} />
          <SummaryCard label="Completed" value={summary.completed} />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="text-slate-300">Status</span>
              <select
                aria-label="Status filter"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                value={filters.status ?? "open"}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as CallbackStatus | "all",
                  }))
                }
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="claimed">Claimed</option>
                <option value="completed">Completed</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-300">Assignee</span>
              <select
                aria-label="Assignee filter"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                value={filters.assigned_agent_id ?? "all"}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    assigned_agent_id: event.target.value,
                  }))
                }
              >
                <option value="all">All agents</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.display_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-300">Search</span>
              <input
                aria-label="Search filter"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                value={filters.search ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
                placeholder="Customer or topic"
              />
            </label>
          </div>

          {listError ? (
            <div className="rounded-xl border border-rose-700/40 bg-rose-950/30 p-4">
              <p className="text-sm text-rose-200">{listError}</p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="callback-list">
              {isLoading ? <p className="text-sm text-slate-400">Loading callbacks...</p> : null}
              {items.map((item) => {
                const isExpanded = expandedId === item.id;
                const isEditing = editingId === item.id;

                return (
                  <div
                    key={item.id}
                    data-testid={`${item.id}-callback-row`}
                    className={`rounded-xl border px-4 py-3 ${
                      isExpanded
                        ? "border-sky-400 bg-slate-800"
                        : "border-slate-800 bg-slate-950"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid min-w-0 flex-1 gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className="font-medium"
                            data-testid={`${item.id}-callback-customer-name`}
                          >
                            {item.customer_name}
                          </span>
                          <span
                            className="text-xs uppercase tracking-wide text-sky-300"
                            data-testid={`${item.id}-callback-priority`}
                          >
                            {item.priority}
                          </span>
                        </div>
                        <span
                          className="text-sm text-slate-400"
                          data-testid={`${item.id}-callback-topic`}
                        >
                          {item.topic}
                        </span>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span data-testid={`${item.id}-callback-status`}>{item.status}</span>
                          <span data-testid={`${item.id}-callback-assignee`}>
                            {item.assigned_agent_name ?? "Unassigned"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-label="Expand"
                        className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-400 hover:text-sky-200"
                        onClick={() => {
                          setConflictMessage(null);
                          setEditingId(null);
                          setExpandedId((current) => (current === item.id ? null : item.id));
                        }}
                      >
                        {isExpanded ? "Collapse" : "Expand"}
                      </button>
                    </div>

                    {isExpanded ? (
                      <div className="mt-4 space-y-4 border-t border-slate-700 pt-4">
                        {conflictMessage ? (
                          <div className="rounded-xl border border-amber-600/30 bg-amber-950/30 p-3 text-sm text-amber-100">
                            {conflictMessage}
                          </div>
                        ) : null}

                        <div data-testid={`${item.id}-details-view`} className="space-y-4">
                          <p className="text-sm text-slate-300">
                            Version:{" "}
                            <span data-testid={`${item.id}-version`}>{item.version}</span>
                          </p>
                          <p className="text-sm text-slate-300">
                            Status: <span>{item.status}</span>
                          </p>
                          <p className="text-sm text-slate-300">
                            Notes: <span>{item.notes}</span>
                          </p>
                        </div>

                        {isEditing ? (
                          <form
                            data-testid={`${item.id}-details-form`}
                            aria-label="Edit callback"
                            className="space-y-4"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void handleSave(item);
                            }}
                          >
                            <label className="block space-y-1 text-sm">
                              <span className="text-slate-300">Details status</span>
                              <select
                                data-testid={`${item.id}-details-status`}
                                aria-label="Details status"
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                                disabled={isMutating}
                                value={statusDraft}
                                onChange={(event) =>
                                  setStatusDraft(event.target.value as CallbackStatus)
                                }
                              >
                                <option value="claimed">Claimed</option>
                                <option value="completed">Completed</option>
                              </select>
                            </label>

                            <label className="block space-y-1 text-sm">
                              <span className="text-slate-300">Notes</span>
                              <textarea
                                data-testid={`${item.id}-notes`}
                                aria-label={`${item.id}-notes`}
                                className="min-h-32 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                                disabled={isMutating}
                                value={notesDraft}
                                onChange={(event) => setNotesDraft(event.target.value)}
                              />
                            </label>

                            <button
                              type="submit"
                              aria-label="Save detail changes"
                              className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                              disabled={isMutating}
                            >
                              {isMutating ? "Saving..." : "Save detail changes"}
                            </button>
                          </form>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {item.status === "open" ? (
                              <button
                                type="button"
                                aria-label="Claim callback"
                                className="rounded-lg bg-sky-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                                disabled={isMutating}
                                onClick={() => void handleClaim(item)}
                              >
                                {isMutating ? "Working..." : "Claim callback"}
                              </button>
                            ) : null}

                            <button
                              type="button"
                              aria-label="Edit"
                              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
                              disabled={isMutating}
                              onClick={() => setEditingId(item.id)}
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
