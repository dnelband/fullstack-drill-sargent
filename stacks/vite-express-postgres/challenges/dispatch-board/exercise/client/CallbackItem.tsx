import React, { useState } from "react";
import {
  CallbackRecord,
  CallbackStatus,
  CallbackUpdateFields,
} from "../../../../shared/types";
import CallbackDetailsForm from "./CallbackDetailsForm";

const CURRENT_AGENT_ID = "a1";

const CallbackItem = ({
  callback,
  onUpdate,
}: {
  callback: CallbackRecord;
  onUpdate: (latests?: CallbackRecord) => void;
}) => {
  const {
    id,
    version,
    topic,
    priority,
    status,
    customer_name,
    assigned_agent_name,
    notes,
  } = callback;

  const handleClaimCallback = () => {
    async function claimCallback() {
      await fetch(`http://localhost:4010/api/callbacks/${id}/claim`, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify({ agent_id: CURRENT_AGENT_ID }),
      });
      onUpdate();
    }
    void claimCallback();
  };

  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);

  return (
    <div
      className="flex flex-col gap-2"
      key={id}
      data-testid={`${id}-callback-row`}
    >
      <div className="flex gap-2 items-center justify-between">
        <div className="flex flex-col">
          {id}
          <small data-testid={`${id}-callback-customer-name`}>
            {customer_name}
          </small>
          <div className="flex gap-2">
            <h3 data-testid={`${id}-callback-topic`} className="text-xl">
              {topic}
            </h3>
            <small data-testid={`${id}-callback-priority`}>{priority}</small>
          </div>
          <div className="flex gap-2">
            <small data-testid={`${id}-callback-assignee`}>
              {assigned_agent_name ?? "Unassigned"}
            </small>
            <span data-testid={`${id}-callback-status`}>{status}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {status === "open" && (
            <button
              className="border rounded p-1 px-2 bg-amber-900 cursor-pointer"
              onClick={() => handleClaimCallback()}
            >
              Claim Callback
            </button>
          )}
          <button
            className="border rounded p-1 px-2 bg-cyan-900 cursor-pointer"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>
      {showDetails && (
        <div data-testid={`${id}-details-view`}>
          <button
            className="border rounded p-1 px-2 bg-cyan-900 cursor-pointer"
            onClick={() => setShowForm(!showForm)}
          >
            Edit
          </button>

          {showForm ? (
            <CallbackDetailsForm callback={callback} onSubmit={onUpdate} />
          ) : (
            <>
              <p data-testid={`${id}-details-notes`}>{notes}</p>
              <span data-testid={`${id}-details-status`}>{status}</span>
              <span data-testid={`${id}-version`}>{version}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CallbackItem;
