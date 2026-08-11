import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ApiError,
  approveLeaveRequest,
  createLeaveRequest,
  fetchLeaveBalance,
  fetchLeaveRequests,
  fetchUsers,
  rejectLeaveRequest,
  updateLeaveRequest,
} from "./api.ts";
import {
  LEAVE_STATUS_OPTIONS,
  LEAVE_TYPE_OPTIONS,
  type LeaveBalance,
  type LeaveRequest,
  type LeaveRequestStatus,
  type LeaveType,
  type LeaveUser,
} from "../../../shared/types.ts";

const CURRENT_USER_ID = "u1";

function upsertLeave(items: LeaveRequest[], next: LeaveRequest) {
  const index = items.findIndex((item) => item._id === next._id);
  if (index === -1) {
    return [...items, next].sort((a, b) =>
      a.start_date === b.start_date
        ? a._id.localeCompare(b._id)
        : a.start_date.localeCompare(b.start_date),
    );
  }
  const copy = [...items];
  copy[index] = next;
  return copy;
}

export function ChallengeApp() {
  const [users, setUsers] = useState<LeaveUser[]>([]);
  const [actorId, setActorId] = useState(CURRENT_USER_ID);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | LeaveRequestStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | LeaveType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [typeDraft, setTypeDraft] = useState<LeaveType>("annual");
  const [startDraft, setStartDraft] = useState("");
  const [endDraft, setEndDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [createType, setCreateType] = useState<LeaveType>("annual");
  const [createStart, setCreateStart] = useState("");
  const [createEnd, setCreateEnd] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const actor = useMemo(
    () => users.find((user) => user._id === actorId) ?? null,
    [users, actorId],
  );
  const isManager = actor?.role === "manager";
  const expanded = useMemo(
    () => items.find((item) => item._id === expandedId) ?? null,
    [items, expandedId],
  );
  const pendingCount = items.filter((item) => item.status === "pending").length;

  async function loadDesk(nextActorId: string, nextStatus = statusFilter, nextType = typeFilter) {
    setIsLoading(true);
    setConflictMessage(null);
    try {
      const nextUsers = users.length > 0 ? users : await fetchUsers();
      if (users.length === 0) {
        setUsers(nextUsers);
      }
      const acting = nextUsers.find((user) => user._id === nextActorId);
      const listParams: { status?: string; type?: string; user_id?: string } = {};
      if (nextStatus !== "all") listParams.status = nextStatus;
      if (nextType !== "all") listParams.type = nextType;
      if (acting?.role === "employee") {
        listParams.user_id = nextActorId;
      }

      const [nextBalance, nextItems] = await Promise.all([
        fetchLeaveBalance(nextActorId).catch(() => null),
        fetchLeaveRequests(listParams),
      ]);
      setBalance(nextBalance);
      setItems(nextItems);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDesk(actorId);
    // Initial load only; actor/filter changes call loadDesk explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!expanded) {
      setTypeDraft("annual");
      setStartDraft("");
      setEndDraft("");
      setNotesDraft("");
      return;
    }
    setTypeDraft(expanded.type);
    setStartDraft(expanded.start_date);
    setEndDraft(expanded.end_date);
    setNotesDraft(expanded.notes);
  }, [expanded]);

  function applyLatest(latest: LeaveRequest) {
    setItems((current) => upsertLeave(current, latest));
    setTypeDraft(latest.type);
    setStartDraft(latest.start_date);
    setEndDraft(latest.end_date);
    setNotesDraft(latest.notes);
  }

  async function refreshBalanceFor(userId: string) {
    try {
      setBalance(await fetchLeaveBalance(userId));
    } catch {
      setBalance(null);
    }
  }

  async function handleActorChange(nextActorId: string) {
    setActorId(nextActorId);
    setExpandedId(null);
    setEditingId(null);
    await loadDesk(nextActorId);
  }

  async function handleFilterChange(nextStatus: "all" | LeaveRequestStatus, nextType: "all" | LeaveType) {
    setStatusFilter(nextStatus);
    setTypeFilter(nextType);
    await loadDesk(actorId, nextStatus, nextType);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!actor || actor.role !== "employee") return;
    setIsMutating(true);
    setConflictMessage(null);
    try {
      const created = await createLeaveRequest({
        user_id: actorId,
        type: createType,
        start_date: createStart,
        end_date: createEnd,
        notes: createNotes,
      });
      setItems((current) => upsertLeave(current, created));
      setCreateStart("");
      setCreateEnd("");
      setCreateNotes("");
    } catch (error) {
      setConflictMessage(error instanceof Error ? error.message : "Create failed");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleSave() {
    if (!expanded) return;
    setIsMutating(true);
    setConflictMessage(null);
    try {
      const updated = await updateLeaveRequest(expanded._id, {
        expected_version: expanded.version,
        type: typeDraft,
        start_date: startDraft,
        end_date: endDraft,
        notes: notesDraft,
      });
      applyLatest(updated);
    } catch (error) {
      handleMutationConflict(error, "Save failed");
    } finally {
      setIsMutating(false);
    }
  }

  function handleMutationConflict(error: unknown, fallback: string) {
    if (error instanceof ApiError && [409, 412, 422].includes(error.status)) {
      const payload = error.payload as { latest?: LeaveRequest };
      if (payload.latest) {
        applyLatest(payload.latest);
      }
    }
    setConflictMessage(error instanceof Error ? error.message : fallback);
  }

  async function handleApprove() {
    if (!expanded || !isManager) return;
    setIsMutating(true);
    setConflictMessage(null);
    try {
      const updated = await approveLeaveRequest(expanded._id, {
        expected_version: expanded.version,
        reviewer_id: actorId,
      });
      applyLatest(updated);
      await refreshBalanceFor(actorId);
    } catch (error) {
      handleMutationConflict(error, "Approve failed");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleReject() {
    if (!expanded || !isManager) return;
    setIsMutating(true);
    setConflictMessage(null);
    try {
      const updated = await rejectLeaveRequest(expanded._id, {
        expected_version: expanded.version,
        reviewer_id: actorId,
      });
      applyLatest(updated);
    } catch (error) {
      handleMutationConflict(error, "Reject failed");
    } finally {
      setIsMutating(false);
    }
  }

  const canEditFields = Boolean(
    expanded &&
      expanded.status === "pending" &&
      !isManager &&
      expanded.user_id === actorId,
  );
  const canReview = Boolean(expanded && expanded.status === "pending" && isManager);

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Leave Desk</p>
          <h1 className="text-3xl font-semibold">Request and review time off</h1>
          <p className="text-sm text-slate-400">
            Balances, overlaps, and versioned approvals from the API.
          </p>
        </header>

        <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Acting as</span>
            <select
              aria-label="Acting as"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              value={actorId}
              onChange={(event) => void handleActorChange(event.target.value)}
            >
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.display_name} ({user.role})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Status filter</span>
            <select
              aria-label="Status filter"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              value={statusFilter}
              onChange={(event) =>
                void handleFilterChange(
                  event.target.value as "all" | LeaveRequestStatus,
                  typeFilter,
                )
              }
            >
              <option value="all">all</option>
              {LEAVE_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Type filter</span>
            <select
              aria-label="Type filter"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              value={typeFilter}
              onChange={(event) =>
                void handleFilterChange(
                  statusFilter,
                  event.target.value as "all" | LeaveType,
                )
              }
            >
              <option value="all">all</option>
              {LEAVE_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase text-slate-400">Annual</p>
            <p data-testid="balance-annual" className="text-2xl font-semibold">
              {balance ? balance.annual_days : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase text-slate-400">Sick</p>
            <p data-testid="balance-sick" className="text-2xl font-semibold">
              {balance ? balance.sick_days : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase text-slate-400">Pending</p>
            <p data-testid="summary-pending" className="text-2xl font-semibold">
              {pendingCount}
            </p>
          </div>
        </div>

        {!isManager && (
          <form
            data-testid="leave-request-form"
            onSubmit={(event) => void handleCreate(event)}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
          >
            <h2 className="text-lg font-medium">New leave request</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span>Type</span>
                <select
                  aria-label="Type"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  value={createType}
                  onChange={(event) => setCreateType(event.target.value as LeaveType)}
                >
                  {LEAVE_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>Notes</span>
                <input
                  aria-label="Notes"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  value={createNotes}
                  onChange={(event) => setCreateNotes(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>Start date</span>
                <input
                  aria-label="Start date"
                  type="date"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  value={createStart}
                  onChange={(event) => setCreateStart(event.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>End date</span>
                <input
                  aria-label="End date"
                  type="date"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  value={createEnd}
                  onChange={(event) => setCreateEnd(event.target.value)}
                  required
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={isMutating}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              Submit leave request
            </button>
          </form>
        )}

        {conflictMessage && (
          <p
            data-testid="conflict-message"
            className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
          >
            {conflictMessage}
          </p>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-medium">
            {isLoading ? "Loading leave…" : "Leave requests"}
          </h2>
          <ul data-testid="leave-list" className="space-y-3">
            {items.map((item) => {
              const isExpanded = expandedId === item._id;
              const isEditing = editingId === item._id;
              return (
                <li
                  key={item._id}
                  data-testid={`${item._id}-leave-row`}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p
                        data-testid={`${item._id}-leave-user-name`}
                        className="font-medium"
                      >
                        {item.user_name}
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                        <span data-testid={`${item._id}-leave-type`}>{item.type}</span>
                        <span data-testid={`${item._id}-leave-status`}>{item.status}</span>
                        <span data-testid={`${item._id}-leave-dates`}>
                          {item.start_date} → {item.end_date}
                        </span>
                        <span data-testid={`${item._id}-leave-days`}>{item.days}d</span>
                        <span data-testid={`${item._id}-leave-version`}>v{item.version}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedId(null);
                          setEditingId(null);
                        } else {
                          setExpandedId(item._id);
                          setEditingId(null);
                        }
                      }}
                    >
                      Expand
                    </button>
                  </div>

                  {isExpanded && !isEditing && (
                    <div
                      data-testid={`${item._id}-details-view`}
                      className="mt-4 space-y-2 border-t border-slate-800 pt-4 text-sm text-slate-300"
                    >
                      <p>Notes: {item.notes || "—"}</p>
                      <p>Days: {item.days}</p>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800"
                        onClick={() => setEditingId(item._id)}
                      >
                        Edit
                      </button>
                    </div>
                  )}

                  {isExpanded && isEditing && (
                    <div
                      data-testid={`${item._id}-details-form`}
                      className="mt-4 space-y-3 border-t border-slate-800 pt-4"
                    >
                      {canEditFields && (
                        <>
                          <label className="flex flex-col gap-1 text-sm">
                            <span>Type</span>
                            <select
                              data-testid={`${item._id}-type`}
                              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                              value={typeDraft}
                              onChange={(event) =>
                                setTypeDraft(event.target.value as LeaveType)
                              }
                            >
                              {LEAVE_TYPE_OPTIONS.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1 text-sm">
                            <span>Start date</span>
                            <input
                              data-testid={`${item._id}-start-date`}
                              type="date"
                              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                              value={startDraft}
                              onChange={(event) => setStartDraft(event.target.value)}
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-sm">
                            <span>End date</span>
                            <input
                              data-testid={`${item._id}-end-date`}
                              type="date"
                              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                              value={endDraft}
                              onChange={(event) => setEndDraft(event.target.value)}
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-sm">
                            <span>Notes</span>
                            <textarea
                              data-testid={`${item._id}-notes`}
                              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                              value={notesDraft}
                              onChange={(event) => setNotesDraft(event.target.value)}
                            />
                          </label>
                          <button
                            type="button"
                            disabled={isMutating}
                            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
                            onClick={() => void handleSave()}
                          >
                            Save detail changes
                          </button>
                        </>
                      )}

                      {canReview && (
                        <div className="flex flex-wrap gap-2">
                          {/* Manager form still exposes fields as read-only hooks for layout consistency */}
                          <input data-testid={`${item._id}-type`} type="hidden" value={item.type} readOnly />
                          <input
                            data-testid={`${item._id}-start-date`}
                            type="hidden"
                            value={item.start_date}
                            readOnly
                          />
                          <input
                            data-testid={`${item._id}-end-date`}
                            type="hidden"
                            value={item.end_date}
                            readOnly
                          />
                          <input
                            data-testid={`${item._id}-notes`}
                            type="hidden"
                            value={item.notes}
                            readOnly
                          />
                          <button
                            type="button"
                            disabled={isMutating}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
                            onClick={() => void handleApprove()}
                          >
                            Approve leave
                          </button>
                          <button
                            type="button"
                            disabled={isMutating}
                            className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium hover:bg-rose-600 disabled:opacity-50"
                            onClick={() => void handleReject()}
                          >
                            Reject leave
                          </button>
                        </div>
                      )}

                      {!canEditFields && !canReview && (
                        <p className="text-sm text-slate-400">No actions for this request.</p>
                      )}
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
