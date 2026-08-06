import { useEffect, useState } from "react";
import {
  Agent,
  CallbackFilters,
  CallbackRecord,
  CallbackStatus,
  CallbackSummary,
  CallbackUpdateFields,
} from "../../../../shared/types";
import CallbackItem from "./CallbackItem";

const CURRENT_AGENT_ID = "a1";
const statusOptions = ["open", "claimed", "completed"];
export function ChallengeApp() {
  // Write your own client HTTP layer in this exercise folder (inline or a local api.ts).
  // Scaffolding does not provide fetch helpers — calling the API is part of the challenge.
  // The acting user is intentionally fixed for this challenge.
  const [filters, setFilters] = useState<CallbackFilters>({
    status: "open",
    assigned_agent_id: "all",
    search: "",
  });
  const [summary, setSummary] = useState<CallbackSummary | null>(null);
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [callbacks, setCallbacks] = useState<CallbackRecord[] | null>(null);

  const [error, setError] = useState<string | null>(null);

  const handleFetchSummary = () => {
    async function fetchSummary() {
      const res = await fetch(`http://localhost:4010/api/summary`);
      const data = await res.json();
      setSummary(data);
    }
    void fetchSummary();
  };

  const handleFetchAgents = () => {
    async function fetchAgents() {
      const res = await fetch(`http://localhost:4010/api/agents`);
      const data = await res.json();
      setAgents(data);
    }
    void fetchAgents();
  };

  const handleFetchCallbacks = () => {
    async function fetchCallbacks() {
      const res = await fetch(
        `http://localhost:4010/api/callbacks?status=${filters.status}&assigned_agent_id=${filters.assigned_agent_id}&search=${filters.search}`,
      );
      const data = await res.json();
      setCallbacks(data);
    }
    void fetchCallbacks();
  };

  const handleFetchData = () => {
    handleFetchSummary();
    handleFetchAgents();
    handleFetchCallbacks();
  };

  const handleUpdate = (latest?: CallbackRecord) => {
    if (!latest) {
      handleFetchCallbacks();
      handleFetchSummary();
      return;
    }
    if (!callbacks) return;
    const updatedCallbacks = callbacks.map((cb) =>
      cb.id === latest.id ? latest : cb,
    );
    setCallbacks(updatedCallbacks);
  };

  useEffect(() => {
    handleFetchCallbacks();
  }, [filters]);

  useEffect(() => {
    handleFetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h1 className="text-3xl font-semibold">Callback Dashboard</h1>
        {error && <div role="alert">{error}</div>}
        {summary && (
          <div className="flex flex-row gap-2 items-left">
            {statusOptions.map((so, index) => (
              <span
                key={`${so}-${index}`}
                className={so === filters.status ? "font-bold" : ""}
                data-testid={`summary-${so}`}
              >
                {so}: {summary[so as keyof CallbackSummary]}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-row gap-2 items-left">
          <div className="flex flex-col gap-1">
            <label>Status</label>
            <select
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as CallbackStatus,
                }))
              }
              value={filters.status}
              aria-label="status filter"
            >
              {statusOptions.map((opt) => (
                <option value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          {agents && (
            <div className="flex flex-col gap-1">
              <label>Assignee</label>
              <select
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    assigned_agent_id: e.target.value,
                  }))
                }
                value={filters.assigned_agent_id}
                aria-label="assignee filter"
              >
                <option value="all">all</option>
                {agents.map((agent) => (
                  <option value={agent.id}>{agent.display_name}</option>
                ))}
              </select>
            </div>
          )}
          <input
            type="text"
            aria-label="search filter"
            placeholder="Search..."
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />
        </div>
        <div className="flex flex-row space-between items-left"></div>
        <p className="max-w-3xl text-sm text-slate-400"></p>
        <div
          className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400"
          data-testid="callback-list"
        >
          {callbacks &&
            callbacks.map((callback) => (
              <CallbackItem
                key={callback.id}
                callback={callback}
                onUpdate={(latest?: CallbackRecord) => handleUpdate(latest)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
