import {
  BASE_URL,
  LEAVE_TYPE_OPTIONS,
  LeaveRequest,
  LeaveType,
} from "@shared/types";
import { useEffect, useState } from "react";

export const LeaveRequestForm = ({
  userId,
  leaveRequest,
  onSubmit,
}: {
  userId: LeaveRequest["user_id"];
  leaveRequest?: LeaveRequest;
  onSubmit: (latest?: LeaveRequest) => void;
}) => {
  const [type, setType] = useState<LeaveType>("annual");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmitLeaveRequest = () => {
    async function submitLeaveRequest() {
      let url = `${BASE_URL}/api/leave-requests`;
      if (leaveRequest) url = `${url}/${leaveRequest._id}`;
      const res = await fetch(url, {
        method: leaveRequest ? "PATCH" : "POST",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          type,
          start_date: startDate,
          end_date: endDate,
          notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSubmit();
      }
    }
    void submitLeaveRequest();
  };

  useEffect(() => {
    if (leaveRequest) {
      setType(leaveRequest.type);
      setStartDate(leaveRequest.start_date);
      setEndDate(leaveRequest.end_date);
      setNotes(leaveRequest.notes);
    }
  }, [leaveRequest]);

  return (
    <div
      data-testid={
        leaveRequest
          ? `${leaveRequest?._id}-details-form`
          : "leave-request-form"
      }
      className="flex flex-col border rounded p-2 gap-2"
    >
      <select
        className="border rounded p-1"
        data-testid={leaveRequest ? `${leaveRequest?._id}-type` : ""}
        aria-label="type"
        value={type}
        onChange={(e) => setType(e.target.value as LeaveType)}
      >
        {LEAVE_TYPE_OPTIONS.map((leaveOption) => (
          <option key={leaveOption} value={leaveOption}>
            {leaveOption}
          </option>
        ))}
      </select>
      <input
        className="border rounded p-1"
        type="text"
        data-testid={
          leaveRequest ? `${leaveRequest?._id}-start-date` : "start-date"
        }
        aria-label="start date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />
      <input
        className="border rounded p-1"
        type="text"
        data-testid={
          leaveRequest ? `${leaveRequest?._id}-end-date` : "end-date"
        }
        aria-label="end date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />
      <textarea
        className="border rounded p-1"
        aria-label="notes"
        data-testid={leaveRequest ? `${leaveRequest?._id}-notes` : "notes"}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex mx-auto">
        <button
          className="border rounded bg-cyan-800 hover:bg-cyan-700 active:bg-cyan-900 p-2 px-4"
          type="submit"
          onClick={handleSubmitLeaveRequest}
        >
          {leaveRequest ? "Save detail changes" : "Submit Leave Request"}
        </button>
      </div>
    </div>
  );
};
