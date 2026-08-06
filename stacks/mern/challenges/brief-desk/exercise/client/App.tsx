import { useEffect, useState } from "react";
import {
  BRIEF_STATUS_OPTIONS,
  BriefStatus,
  Member,
  type BriefFilters,
  type BriefRecord,
  type BriefSummary,
} from "../../../../shared/types";
import BriefItem from "./BriefItem";

// The acting user is intentionally fixed for this challenge.
export const CURRENT_MEMBER_ID = "m1";
const BASE_URL = "http://localhost:4020";
export function ChallengeApp() {
  // Write your own client HTTP layer in this exercise folder (inline or a local api.ts).
  const [filters, setFilters] = useState<BriefFilters>({
    status: "open",
    assigned_member_id: "all",
    search: "",
  });

  const [summary, setSummary] = useState<BriefSummary | null>(null);
  const [briefs, setBriefs] = useState<BriefRecord[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);

  const handleFetchSummary = () => {
    async function fetchSumary() {
      const res = await fetch(`${BASE_URL}/api/summary`);
      const data = await res.json();
      console.log(data, "DATA");
      setSummary(data);
    }
    void fetchSumary();
  };

  const handleFetchMembers = () => {
    async function fetchMembers() {
      const res = await fetch(`${BASE_URL}/api/members`);
      const data = await res.json();
      setMembers(data);
    }
    void fetchMembers();
  };

  const handleFetchBriefs = () => {
    async function fetchBriefs() {
      const res = await fetch(
        `${BASE_URL}/api/briefs?status=${filters.status}&assigned_member_id=${filters.assigned_member_id}&search=${filters.search}`,
      );
      const data = await res.json();
      setBriefs(data);
    }
    void fetchBriefs();
  };

  const handleFetchData = () => {
    handleFetchMembers();
    handleFetchSummary();
    handleFetchBriefs();
  };

  useEffect(() => {
    handleFetchData();
  }, []);

  useEffect(() => {
    handleFetchBriefs();
  }, [filters]);

  const handleClaimBrief = (brief: BriefRecord) => {
    async function claimBrief() {
      await fetch(`${BASE_URL}/api/briefs/${brief._id}/claim`, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify({
          member_id: CURRENT_MEMBER_ID,
        }),
      });
      handleFetchSummary();
      handleFetchBriefs();
    }
    void claimBrief();
  };

  const handleUpdateBrief = (latest?: BriefRecord) => {
    if (!latest) {
      handleFetchBriefs();
      handleFetchSummary();
      return;
    }
    if (!briefs) return;
    const updatedBriefs = briefs.map((b) =>
      b._id === latest._id ? latest : b,
    );
    setBriefs(updatedBriefs);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h1 className="text-4xl font-semibold">Brief Desk</h1>
        {summary && (
          <div className="flex gap-2">
            <div className="flex flex-col gap-2">
              <small>Open</small>
              <span className="text-3xl" data-testid="summary-open">
                {summary.open}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <small>Claimed</small>
              <span className="text-3xl" data-testid="summary-claimed">
                {summary.claimed}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <small>Completed</small>
              <span className="text-3xl" data-testid="summary-completed">
                {summary.completed}
              </span>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <select
            className="border rounded p-1"
            aria-label="status filter"
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status: e.target.value as BriefStatus,
              }))
            }
          >
            {BRIEF_STATUS_OPTIONS.map((bo) => (
              <option key={`${bo}-status-filter-option`} value={bo}>
                {bo}
              </option>
            ))}
          </select>

          <select
            className="border rounded p-1"
            aria-label="assignee filter"
            value={filters.assigned_member_id}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                assigned_member_id: e.target.value,
              }))
            }
          >
            <option value="all">All</option>
            {members?.map((member, index) => (
              <option
                key={`${member._id}-${index}-member-filter-option`}
                value={member._id}
              >
                {member.display_name}
              </option>
            ))}
          </select>

          <input
            type="text"
            className="border rounded p-1"
            aria-label="search filter"
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            value={filters.search}
          />
        </div>
        {briefs && (
          <div className="flex flex-col gap-2" data-testid="brief-list">
            {briefs.map((brief) => (
              <BriefItem
                key={brief._id}
                brief={brief}
                onClaimBrief={(brief) => handleClaimBrief(brief)}
                onUpdateBrief={(latest) => handleUpdateBrief(latest)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
