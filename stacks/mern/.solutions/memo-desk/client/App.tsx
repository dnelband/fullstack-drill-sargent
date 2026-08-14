import { useEffect, useState } from "react";
import {
  ApiError,
  archiveMemo,
  fetchMemoSummary,
  fetchMemos,
  patchMemo,
} from "./api.ts";
import { CURRENT_OWNER_ID } from "../../../shared/memo-desk.ts";
import {
  MEMO_STATUS_OPTIONS,
  type MemoRecord,
  type MemoStatus,
  type MemoSummary,
} from "../../../shared/types.ts";

export function ChallengeApp() {
  const [items, setItems] = useState<MemoRecord[]>([]);
  const [summary, setSummary] = useState<MemoSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<MemoStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [draftVersion, setDraftVersion] = useState(1);
  const [staleMessage, setStaleMessage] = useState<string | null>(null);
  const [goneMessage, setGoneMessage] = useState<string | null>(null);

  function clearSignals() {
    setStaleMessage(null);
    setGoneMessage(null);
  }

  async function refreshBoard(status: MemoStatus | "all" = statusFilter) {
    const [nextItems, nextSummary] = await Promise.all([
      fetchMemos(status),
      fetchMemoSummary(),
    ]);
    setItems(nextItems);
    setSummary(nextSummary);
  }

  useEffect(() => {
    void refreshBoard("all");
  }, []);

  async function handleStatusChange(next: MemoStatus | "all") {
    setStatusFilter(next);
    clearSignals();
    await refreshBoard(next);
  }

  function handleExpand(memo: MemoRecord) {
    setExpandedId((current) => (current === memo._id ? null : memo._id));
    setEditingId(null);
    clearSignals();
  }

  function handleEdit(memo: MemoRecord) {
    setExpandedId(memo._id);
    setEditingId(memo._id);
    setDraftBody(memo.body);
    setDraftVersion(memo.version);
    clearSignals();
  }

  async function handleSave(id: string) {
    clearSignals();
    try {
      await patchMemo(id, {
        owner_id: CURRENT_OWNER_ID,
        expected_version: draftVersion,
        body: draftBody,
      });
      setEditingId(null);
      await refreshBoard();
    } catch (error) {
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
      setStaleMessage(error instanceof Error ? error.message : "Save failed");
    }
  }

  async function handleArchive(id: string, version: number) {
    clearSignals();
    try {
      await archiveMemo(id, {
        owner_id: CURRENT_OWNER_ID,
        expected_version: version,
      });
      setEditingId(null);
      await refreshBoard();
    } catch (error) {
      if (error instanceof ApiError && error.status === 412) {
        const payload = error.payload as { message?: string };
        setStaleMessage(String(payload.message ?? error.message));
        await refreshBoard();
        return;
      }
      if (error instanceof ApiError && error.status === 410) {
        const payload = error.payload as { message?: string };
        setGoneMessage(String(payload.message ?? error.message));
        await refreshBoard();
        return;
      }
      setGoneMessage(error instanceof Error ? error.message : "Archive failed");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-teal-300">
            Memo Desk
          </p>
          <h1 className="text-3xl font-semibold">Team memos</h1>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase text-slate-400">Active</p>
            <p data-testid="summary-active" className="text-2xl font-semibold">
              {summary?.active ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase text-slate-400">Archived</p>
            <p
              data-testid="summary-archived"
              className="text-2xl font-semibold"
            >
              {summary?.archived ?? "—"}
            </p>
          </div>
        </div>

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
              void handleStatusChange(event.target.value as MemoStatus | "all")
            }
          >
            <option value="all">all</option>
            {MEMO_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <ul data-testid="memo-list" className="space-y-3">
          {items.map((memo) => {
            const expanded = expandedId === memo._id;
            const editing = editingId === memo._id;
            const mine = memo.owner_id === CURRENT_OWNER_ID;
            return (
              <li
                key={memo._id}
                data-testid={`${memo._id}-memo-row`}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p
                      data-testid={`${memo._id}-memo-title`}
                      className="text-lg font-medium"
                    >
                      {memo.title}
                    </p>
                    <p data-testid={`${memo._id}-memo-status`}>{memo.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm"
                      onClick={() => handleExpand(memo)}
                    >
                      Expand
                    </button>
                    {mine && memo.status === "active" ? (
                      <>
                        <button
                          type="button"
                          className="rounded-lg border border-teal-600 px-3 py-1.5 text-sm text-teal-100"
                          onClick={() => handleEdit(memo)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-rose-700 px-3 py-1.5 text-sm text-rose-100"
                          onClick={() =>
                            void handleArchive(memo._id, memo.version)
                          }
                        >
                          Archive memo
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {expanded && !editing ? (
                  <div
                    data-testid={`${memo._id}-details-view`}
                    className="mt-4 space-y-2 border-t border-slate-800 pt-4 text-sm text-slate-300"
                  >
                    <p data-testid={`${memo._id}-body`}>{memo.body}</p>
                    <p data-testid={`${memo._id}-version`}>
                      Version {memo.version}
                    </p>
                  </div>
                ) : null}

                {editing ? (
                  <form
                    data-testid={`${memo._id}-details-form`}
                    className="mt-4 space-y-3 border-t border-slate-800 pt-4"
                    onSubmit={(event) => event.preventDefault()}
                  >
                    <label className="flex flex-col gap-1 text-sm">
                      <span>Body</span>
                      <textarea
                        aria-label={`${memo._id}-body`}
                        data-testid={`${memo._id}-body`}
                        className="min-h-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                        value={draftBody}
                        onChange={(event) => setDraftBody(event.target.value)}
                      />
                    </label>
                    <p data-testid={`${memo._id}-version`}>
                      Version {draftVersion}
                    </p>
                    <button
                      type="button"
                      className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm"
                      onClick={() => void handleSave(memo._id)}
                    >
                      Save detail changes
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
