import { useState } from "react";
import { LeaveRequest } from "../../../../shared/types";
import { LeaveRequestForm } from "./LeaveRequestForm";
export const LeaveRequestItem = ({
  LeaveRequest,
  userId,
  onUpdateLeaveRequest,
}: {
  LeaveRequest: LeaveRequest;
  userId: string;
  onUpdateLeaveRequest: (latest?: LeaveRequest) => void;
}) => {
  const { _id, user_name, start_date, end_date } = LeaveRequest;

  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);

  return (
    <div
      data-testid={`${_id}-leave-row`}
      className="flex flex-col gap-2 border-b-1 p-2 last:border-b-0"
    >
      <div className="flex gap-2 items-center justify-between">
        <div className="flex gap-2">
          <div data-testid={`${_id}-leave-user-name`} className="text-2xl">
            {user_name}
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="cursor-pointer border rounded bg-cyan-800 hover:bg-cyan-700 active:bg-cyan-900 p-2 px-4"
          >
            Expand
          </button>
        </div>
        <div className="flex gap-2" data-testid={`${_id}-leave-dates`}>
          <span>{start_date}</span>
          <span>-</span>
          <span>{end_date}</span>
        </div>
      </div>
      {showDetails && (
        <div data-testid={`${_id}-details-view`}>
          <button
            onClick={() => setShowForm(!showForm)}
            className="cursor-pointer border rounded bg-cyan-800 hover:bg-cyan-700 active:bg-cyan-900 p-2 px-4"
          >
            Edit
          </button>
          {showForm && (
            <LeaveRequestForm
              leaveRequest={LeaveRequest}
              userId={userId}
              onSubmit={onUpdateLeaveRequest}
            />
          )}
        </div>
      )}
    </div>
  );
};
