// Write your own client HTTP layer here (inline or local api.ts).
// Flow: acting as → balance + list → submit leave → expand → Edit → save / approve / reject.
// Apply latest on 409. Overlap returns conflicting_request. CURRENT_USER_ID = "u1".

import {
  CURRENT_USER_ID,
  LeaveBalance,
  LeaveRequest,
  LeaveUser,
} from "@shared/types";
import { useEffect, useState } from "react";
import { BASE_URL } from "../../../../shared/types";
import { LeaveRequestItem } from "./LeaveRequestItem";
import { LeaveRequestForm } from "./LeaveRequestForm";

export function ChallengeApp() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[] | null>();
  const [leaveUsers, setLeaveUsers] = useState<LeaveUser[] | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(
    CURRENT_USER_ID,
  );
  const [currentUserLeaveBalance, setCurrentUserLeaveBalance] =
    useState<LeaveBalance | null>(null);

  const handleFetchUsers = () => {
    async function fetchUsers() {
      const res = await fetch(`${BASE_URL}/api/users`);
      const data = await res.json();
      setLeaveUsers(data);
    }
    void fetchUsers();
  };

  const handleFetchLeaveRequests = () => {
    async function fetchLeaveRequests() {
      const res = await fetch(
        `${BASE_URL}/api/leave-requests?user_id=${currentUser}`,
      );
      const data = await res.json();
      setLeaveRequests(data);
    }
    void fetchLeaveRequests();
  };

  const handleFetchCurrentUserLeaveBalance = () => {
    async function fetchCurrentUserLeaveBalance() {
      if (!currentUser) return;
      const res = await fetch(
        `${BASE_URL}/api/leave-balance?user_id=${currentUser}`,
      );
      const data = await res.json();
      setCurrentUserLeaveBalance(data);
    }
    void fetchCurrentUserLeaveBalance();
  };

  useEffect(() => {
    handleFetchUsers();
  }, []);

  useEffect(() => {
    if (currentUser) {
      handleFetchCurrentUserLeaveBalance();
      handleFetchLeaveRequests();
    }
  }, [currentUser]);

  const handleSubmitLeaveRequest = (latest?: LeaveRequest) => {
    if (!latest) handleFetchLeaveRequests();
  };

  const handleUpdateLeaveRequest = (latest?: LeaveRequest) => {
    if (!latest) handleFetchLeaveRequests();
  };
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="flex flex-col mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/70 p-6 gap-4">
        <h1 className="text-3xl font-semibold">Leave Desk</h1>
        {leaveUsers && (
          <div className="flex gap-2">
            <span>Acting As:</span>
            <select
              aria-label="acting as"
              value={currentUser ?? CURRENT_USER_ID}
              onChange={(e) => setCurrentUser(e.target.value)}
            >
              {leaveUsers.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.display_name}
                </option>
              ))}
            </select>
          </div>
        )}
        {currentUserLeaveBalance && (
          <div className="flex gap-4">
            <div className="flex flex-col">
              <span className="text-xl">Annual Days</span>
              <span className="text-2xl mx-auto" data-testid="balance-annual">
                {currentUserLeaveBalance.annual_days}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl">Sick Days</span>
              <span className="text-2xl mx-auto" data-testid="balance-sick">
                {currentUserLeaveBalance.sick_days}
              </span>
            </div>
          </div>
        )}
        {currentUser && (
          <LeaveRequestForm
            userId={currentUser}
            onSubmit={handleSubmitLeaveRequest}
          />
        )}
        {leaveRequests && (
          <div className="border rounded" data-testid="leave-list">
            {leaveRequests.map((leaveRequests) => (
              <LeaveRequestItem
                userId={currentUser as string}
                key={leaveRequests._id}
                LeaveRequest={leaveRequests}
                onUpdateLeaveRequest={handleUpdateLeaveRequest}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
