import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  claimBrief,
  fetchBriefs,
  fetchMembers,
  fetchSummary,
  updateBrief,
} from "./api.ts";
import type {
  BriefFilters,
  BriefRecord,
  BriefStatus,
  BriefSummary,
  Member,
} from "../../../shared/types.ts";

const CURRENT_MEMBER_ID = "m1";
const emptySummary: BriefSummary = { open: 0, claimed: 0, completed: 0 };

function upsertBrief(items: BriefRecord[], nextItem: BriefRecord) {
  const index = items.findIndex((item) => item._id === nextItem._id);
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
  const [members, setMembers] = useState<Member[]>([]);
  const [filters, setFilters] = useState<BriefFilters>({
    status: "open",
    assigned_member_id: "all",
    search: "",
  });
  const [items, setItems] = useState<BriefRecord[]>([]);
  const [summary, setSummary] = useState<BriefSummary>(emptySummary);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<BriefStatus>("claimed");
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const expandedBrief = useMemo(
    () => items.find((item) => item._id === expandedId) ?? null,
    [items, expandedId],
  );

  useEffect(() => {
    void fetchMembers().then(setMembers);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setConflictMessage(null);
    void Promise.all([fetchBriefs(filters), fetchSummary()])
      .then(([nextItems, nextSummary]) => {
        setItems(nextItems);
        setSummary(nextSummary);
        setExpandedId((current) =>
          current && nextItems.some((item) => item._id === current) ? current : null,
        );
        setEditingId((current) =>
          current && nextItems.some((item) => item._id === current) ? current : null,
        );
      })
      .finally(() => setIsLoading(false));
  }, [filters]);

  useEffect(() => {
    if (!expandedBrief) {
      setNotesDraft("");
      setStatusDraft("claimed");
      return;
    }
    setNotesDraft(expandedBrief.notes);
    setStatusDraft(expandedBrief.status === "open" ? "claimed" : expandedBrief.status);
  }, [expandedBrief]);

  async function handleClaim(brief: BriefRecord) {
    setIsMutating(true);
    setConflictMessage(null);
    try {
      const claimed = await claimBrief(brief._id, { member_id: CURRENT_MEMBER_ID });
      const statusFilter = filters.status ?? "open";
      const stillMatches = statusFilter === "all" || claimed.status === statusFilter;
      setItems((current) =>
        stillMatches
          ? upsertBrief(current, claimed)
          : current.filter((item) => item._id !== claimed._id),
      );
      if (!stillMatches) {
        setExpandedId(null);
        setEditingId(null);
      } else {
        setExpandedId(claimed._id);
        setEditingId(null);
      }
      setSummary(await fetchSummary());
    } catch (error: unknown) {
      setConflictMessage(error instanceof Error ? error.message : "Failed to claim brief.");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleSave(brief: BriefRecord) {
    setIsMutating(true);
    setConflictMessage(null);
    try {
      const updated = await updateBrief(brief._id, {
        expected_version: brief.version,
        status: statusDraft,
        notes: notesDraft,
      });
      setItems((current) => upsertBrief(current, updated));
      setExpandedId(updated._id);
      setEditingId(updated._id);
      setSummary(await fetchSummary());
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        const payload = error.payload as { latest?: BriefRecord };
        if (payload.latest) {
          setItems((current) => upsertBrief(current, payload.latest as BriefRecord));
          setExpandedId(payload.latest._id);
          setEditingId(payload.latest._id);
        }
      }
      setConflictMessage(error instanceof Error ? error.message : "Failed to update brief.");
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Brief Desk</p>
          <h1 className="text-3xl font-semibold">Agency client brief intake</h1>
          <p className="max-w-3xl text-sm text-slate-400">
            Claim client briefs, keep delivery notes current, and resolve stale edits without losing
            the latest studio copy.
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
                    status: event.target.value as BriefStatus | "all",
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
                value={filters.assigned_member_id ?? "all"}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    assigned_member_id: event.target.value,
                  }))
                }
              >
                <option value="all">All members</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.display_name}
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
                placeholder="Client or title"
              />
            </label>
          </div>

          <div className="space-y-3" data-testid="brief-list">
            {isLoading ? <p className="text-sm text-slate-400">Loading briefs...</p> : null}
            {items.map((item) => {
              const isExpanded = expandedId === item._id;
              const isEditing = editingId === item._id;

              return (
                <div
                  key={item._id}
                  data-testid={`${item._id}-brief-row`}
                  className={`rounded-xl border px-4 py-3 ${
                    isExpanded ? "border-amber-400 bg-slate-800" : "border-slate-800 bg-slate-950"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid min-w-0 flex-1 gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className="font-medium"
                          data-testid={`${item._id}-brief-client-name`}
                        >
                          {item.client_name}
                        </span>
                        <span
                          className="text-xs uppercase tracking-wide text-amber-300"
                          data-testid={`${item._id}-brief-priority`}
                        >
                          {item.priority}
                        </span>
                      </div>
                      <span className="text-sm text-slate-400" data-testid={`${item._id}-brief-title`}>
                        {item.title}
                      </span>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span data-testid={`${item._id}-brief-status`}>{item.status}</span>
                        <span data-testid={`${item._id}-brief-assignee`}>
                          {item.assigned_member_name ?? "Unassigned"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-label="Expand"
                      className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200"
                      onClick={() => {
                        setConflictMessage(null);
                        setEditingId(null);
                        setExpandedId((current) => (current === item._id ? null : item._id));
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

                      <div data-testid={`${item._id}-details-view`} className="space-y-2 text-sm text-slate-300">
                        <p>
                          Version: <span data-testid={`${item._id}-version`}>{item.version}</span>
                        </p>
                        <p>Status: {item.status}</p>
                        <p>Notes: {item.notes}</p>
                      </div>

                      {isEditing ? (
                        <form
                          data-testid={`${item._id}-details-form`}
                          className="space-y-4"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void handleSave(item);
                          }}
                        >
                          <label className="block space-y-1 text-sm">
                            <span className="text-slate-300">Details status</span>
                            <select
                              data-testid={`${item._id}-details-status`}
                              aria-label="Details status"
                              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                              disabled={isMutating}
                              value={statusDraft}
                              onChange={(event) =>
                                setStatusDraft(event.target.value as BriefStatus)
                              }
                            >
                              <option value="claimed">Claimed</option>
                              <option value="completed">Completed</option>
                            </select>
                          </label>

                          <label className="block space-y-1 text-sm">
                            <span className="text-slate-300">Notes</span>
                            <textarea
                              data-testid={`${item._id}-notes`}
                              aria-label={`${item._id}-notes`}
                              className="min-h-32 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                              disabled={isMutating}
                              value={notesDraft}
                              onChange={(event) => setNotesDraft(event.target.value)}
                            />
                          </label>

                          <button
                            type="submit"
                            aria-label="Save detail changes"
                            className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
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
                              aria-label="Claim brief"
                              className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
                              disabled={isMutating}
                              onClick={() => void handleClaim(item)}
                            >
                              {isMutating ? "Working..." : "Claim brief"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            aria-label="Edit"
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium"
                            disabled={isMutating}
                            onClick={() => setEditingId(item._id)}
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
        </section>
      </div>
    </div>
  );
}
