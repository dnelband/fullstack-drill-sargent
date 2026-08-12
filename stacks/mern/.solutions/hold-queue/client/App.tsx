import { useEffect, useState } from "react";
import {
  ApiError,
  fetchQueue,
  fetchQueueSummary,
  holdItem,
  patchItem,
} from "./api.ts";
import {
  CURRENT_MEMBER_ID,
} from "../../../shared/hold-queue.ts";
import {
  HOLD_QUEUE_STATUS_OPTIONS,
  type HoldQueueItem,
  type HoldQueueStatus,
  type HoldQueueSummary,
} from "../../../shared/types.ts";

function isActivelyHeld(item: HoldQueueItem): boolean {
  if (item.status !== "held" || !item.held_until) {
    return false;
  }
  return Date.parse(item.held_until) > Date.now();
}

export function ChallengeApp() {
  const [items, setItems] = useState<HoldQueueItem[]>([]);
  const [summary, setSummary] = useState<HoldQueueSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<HoldQueueStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState("");
  const [draftVersion, setDraftVersion] = useState(1);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [staleMessage, setStaleMessage] = useState<string | null>(null);
  const [goneMessage, setGoneMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function refreshBoard(status: HoldQueueStatus | "all" = statusFilter) {
    const [nextItems, nextSummary] = await Promise.all([
      fetchQueue(status),
      fetchQueueSummary(),
    ]);
    setItems(nextItems);
    setSummary(nextSummary);
  }

  useEffect(() => {
    void refreshBoard("all");
  }, []);

  async function handleStatusChange(next: HoldQueueStatus | "all") {
    setStatusFilter(next);
    setConflictMessage(null);
    setStaleMessage(null);
    setGoneMessage(null);
    await refreshBoard(next);
  }

  async function handleHold(id: string) {
    setConflictMessage(null);
    setStaleMessage(null);
    setGoneMessage(null);
    try {
      await holdItem(id, { member_id: CURRENT_MEMBER_ID });
      await refreshBoard();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const payload = error.payload as { message?: string };
        setConflictMessage(String(payload.message ?? error.message));
        await refreshBoard();
        return;
      }
      setConflictMessage(error instanceof Error ? error.message : "Hold failed");
    }
  }

  function handleExpand(item: HoldQueueItem) {
    setExpandedId((current) => (current === item._id ? null : item._id));
    setEditingId(null);
    setStaleMessage(null);
    setGoneMessage(null);
  }

  function handleEdit(item: HoldQueueItem) {
    setExpandedId(item._id);
    setEditingId(item._id);
    setDraftNotes(item.notes);
    setDraftVersion(item.version);
    setStaleMessage(null);
    setGoneMessage(null);
  }

  async function handleSave(id: string) {
    setSaving(true);
    setStaleMessage(null);
    setGoneMessage(null);
    setConflictMessage(null);
    try {
      await patchItem(id, {
        member_id: CURRENT_MEMBER_ID,
        expected_version: draftVersion,
        notes: draftNotes,
      });
      setEditingId(null);
      await refreshBoard();
    } catch (error) {
      if (error instanceof ApiError && error.status === 412) {
        const payload = error.payload as {
          message?: string;
          latest?: HoldQueueItem;
        };
        setStaleMessage(String(payload.message ?? error.message));
        if (payload.latest) {
          setDraftNotes(payload.latest.notes);
          setDraftVersion(payload.latest.version);
        }
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
      setStaleMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">
            Hold Queue
          </p>
          <h1 className="text-3xl font-semibold">Soft-hold facility work</h1>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase text-slate-400">Open</p>
            <p data-testid="summary-open" className="text-2xl font-semibold">
              {summary?.open ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase text-slate-400">Held</p>
            <p data-testid="summary-held" className="text-2xl font-semibold">
              {summary?.held ?? "—"}
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

        <label className="flex max-w-xs flex-col gap-1 text-sm">
          <span className="text-slate-400">Status filter</span>
          <select
            aria-label="Status filter"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={statusFilter}
            onChange={(event) =>
              void handleStatusChange(event.target.value as HoldQueueStatus | "all")
            }
          >
            <option value="all">all</option>
            {HOLD_QUEUE_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <ul data-testid="queue-list" className="space-y-3">
          {items.map((item) => {
            const active = isActivelyHeld(item);
            const expanded = expandedId === item._id;
            const editing = editingId === item._id;
            return (
              <li
                key={item._id}
                data-testid={`${item._id}-queue-row`}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p
                      data-testid={`${item._id}-queue-title`}
                      className="font-medium"
                    >
                      {item.title}
                    </p>
                    <p data-testid={`${item._id}-queue-status`} className="text-sm text-slate-400">
                      {active ? "held" : "open"}
                    </p>
                    {active && item.held_by_name ? (
                      <p
                        data-testid={`${item._id}-queue-holder`}
                        className="text-sm text-cyan-200"
                      >
                        {item.held_by_name}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {!active ? (
                      <button
                        type="button"
                        className="rounded-lg bg-cyan-700 px-3 py-1.5 text-sm"
                        onClick={() => void handleHold(item._id)}
                      >
                        Hold item
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm"
                      onClick={() => handleExpand(item)}
                    >
                      Expand
                    </button>
                  </div>
                </div>

                {expanded ? (
                  <div className="mt-4 border-t border-slate-800 pt-4">
                    {!editing ? (
                      <div data-testid={`${item._id}-details-view`} className="space-y-2">
                        <p className="text-sm text-slate-300">
                          Notes: {item.notes || "(none)"}
                        </p>
                        <p
                          data-testid={`${item._id}-version`}
                          className="text-xs text-slate-500"
                        >
                          {item.version}
                        </p>
                        {active && item.held_by_id === CURRENT_MEMBER_ID ? (
                          <button
                            type="button"
                            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm"
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <form
                        data-testid={`${item._id}-details-form`}
                        className="space-y-3"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void handleSave(item._id);
                        }}
                      >
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="text-slate-400">Notes</span>
                          <textarea
                            aria-label={`${item._id}-notes`}
                            className="min-h-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                            value={draftNotes}
                            disabled={saving}
                            onChange={(event) => setDraftNotes(event.target.value)}
                          />
                        </label>
                        <p
                          data-testid={`${item._id}-version`}
                          className="text-xs text-slate-500"
                        >
                          {draftVersion}
                        </p>
                        <button
                          type="submit"
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm disabled:opacity-50"
                          disabled={saving}
                        >
                          Save detail changes
                        </button>
                      </form>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
