import { useEffect, useState } from "react";
import { ApiError, claimTicket, fetchTicketSummary, fetchTickets } from "./api.ts";
import {
  CURRENT_MEMBER_ID,
  TICKET_STATUS_OPTIONS,
  type TicketRecord,
  type TicketStatus,
  type TicketSummary,
} from "../../../shared/types.ts";

export function ChallengeApp() {
  const [items, setItems] = useState<TicketRecord[]>([]);
  const [summary, setSummary] = useState<TicketSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadSummary() {
    setSummary(await fetchTicketSummary());
  }

  async function loadTickets(status: TicketStatus | "all") {
    setItems(await fetchTickets(status));
  }

  async function refreshBoard(status: TicketStatus | "all" = statusFilter) {
    await Promise.all([loadTickets(status), loadSummary()]);
  }

  useEffect(() => {
    setIsLoading(true);
    void Promise.all([loadSummary(), loadTickets("all")]).finally(() =>
      setIsLoading(false),
    );
  }, []);

  async function handleStatusChange(next: TicketStatus | "all") {
    setStatusFilter(next);
    setConflictMessage(null);
    await loadTickets(next);
  }

  async function handleClaim(id: string) {
    setConflictMessage(null);
    try {
      await claimTicket(id, { member_id: CURRENT_MEMBER_ID });
      await refreshBoard();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const payload = error.payload as { message?: string };
        setConflictMessage(String(payload.message ?? error.message));
        await refreshBoard();
        return;
      }
      setConflictMessage(error instanceof Error ? error.message : "Claim failed");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-rose-300">
            Ticket Claim
          </p>
          <h1 className="text-3xl font-semibold">Claim open support tickets</h1>
          <p className="text-sm text-slate-400">
            Server list is SoT — after claim success or 409, refetch list + summary.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase text-slate-400">Open</p>
            <p data-testid="summary-open" className="text-2xl font-semibold">
              {summary?.open ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase text-slate-400">Claimed</p>
            <p data-testid="summary-claimed" className="text-2xl font-semibold">
              {summary?.claimed ?? "—"}
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
              void handleStatusChange(event.target.value as TicketStatus | "all")
            }
          >
            <option value="all">all</option>
            {TICKET_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

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
            {isLoading ? "Loading…" : `Tickets (${items.length})`}
          </h2>
          <ul data-testid="ticket-list" className="space-y-3">
            {items.map((item) => (
              <li
                key={item._id}
                data-testid={`${item._id}-ticket-row`}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p
                      data-testid={`${item._id}-ticket-title`}
                      className="font-medium"
                    >
                      {item.title}
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                      <span data-testid={`${item._id}-ticket-status`}>
                        {item.status}
                      </span>
                      {item.claimed_by_name ? (
                        <span data-testid={`${item._id}-ticket-claimed-by`}>
                          {item.claimed_by_name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg bg-rose-700 px-3 py-1.5 text-sm font-medium hover:bg-rose-600 disabled:opacity-40"
                    disabled={item.status !== "open"}
                    onClick={() => void handleClaim(item._id)}
                  >
                    Claim ticket
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
