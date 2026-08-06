import { BRIEF_STATUS_OPTIONS, BriefRecord } from "@shared/types";
import { useEffect, useState } from "react";
const BASE_URL = "http://localhost:4020";

const BriefItem = ({
  brief,
  onClaimBrief,
  onUpdateBrief,
}: {
  brief: BriefRecord;
  onClaimBrief: (brief: BriefRecord) => void;
  onUpdateBrief: (latest?: BriefRecord) => void;
}) => {
  const {
    _id,
    title,
    notes,
    version,
    client_name,
    priority,
    assigned_member_name,
    status,
  } = brief;

  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [updatedNotes, setUpdatedNotes] = useState("");
  const [updatedStatus, setUpdatedStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUpdatedNotes(notes);
    setUpdatedStatus(status);
  }, []);

  const handleUpdateBrief = () => {
    async function updateBrief() {
      const res = await fetch(`${BASE_URL}/api/briefs/${brief._id}`, {
        method: "PATCH",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify({
          expected_version: brief.version,
          notes: updatedNotes,
          status: updatedStatus,
        }),
      });
      const data = await res.json();
      let latest;
      if (res.status === 409) {
        setError(data.message);
        latest = data.latest;
        setUpdatedNotes(latest.notes);
        setUpdatedStatus(latest.status);
      }
      onUpdateBrief(latest);
      setLoading(false);
      setShowForm(false);
    }
    setLoading(true);
    void updateBrief();
  };

  return (
    <div
      data-testid={`${_id}-brief-row`}
      className="border rounded my-2 p-4 flex flex-col gap-2"
    >
      <div className="flex gap-2 justify-between items-center">
        <div>
          <div data-testid={`${_id}-brief-title`} className="text-2xl">
            {title}
          </div>
          <div className="flex gap-2">
            <div>
              <span>Client:</span>
              <span data-testid={`${_id}-brief-client-name`}>
                {client_name}
              </span>
            </div>

            <div>
              <span>Status:</span>
              <span data-testid={`${_id}-brief-status`}>{status}</span>
            </div>

            <div>
              <span>Priority:</span>
              <span data-testid={`${_id}-brief-priority`}>{priority}</span>
            </div>

            <div>
              <span>Assignee:</span>
              <span data-testid={`${_id}-brief-assignee`}>
                {assigned_member_name ?? "Unassigned"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          {status === "open" && (
            <button
              onClick={() => onClaimBrief(brief)}
              className="border rounded bg-amber-900 cursor-pointer p-2 hover:bg-amber-700"
            >
              claim brief
            </button>
          )}
          <button
            className="border rounded bg-cyan-900 cursor-pointer p-2 hover:bg-cyan-700"
            onClick={() => setShowDetails(!showDetails)}
          >
            Expand
          </button>
        </div>
      </div>
      {showDetails && (
        <div data-testid={`${_id}-details-view`}>
          <button
            className="border rounded bg-cyan-900 cursor-pointer p-2 hover:bg-cyan-700"
            onClick={() => setShowForm(!showForm)}
          >
            edit
          </button>
          {!showForm ? (
            <>
              <p>{notes}</p>
              <div className="flex gap-2">
                <small>
                  <span>Version: </span>
                  <span data-testid={`${_id}-version`}>{version}</span>
                </small>
                <small>Status: {status}</small>
              </div>
            </>
          ) : (
            <div
              className="flex flex-col gap-2"
              data-testid={`${_id}-details-form`}
            >
              {error && <p className="bg-amber-500">{error}</p>}
              <input
                type="text"
                className="border rounded p-2"
                value={updatedNotes}
                onChange={(e) => setUpdatedNotes(e.target.value)}
                data-testid={`${_id}-notes`}
                disabled={loading}
              />
              <select
                disabled={loading}
                className="border rounded p-1"
                data-testid={`${_id}-details-status`}
                value={updatedStatus}
                onChange={(e) => setUpdatedStatus(e.target.value)}
              >
                {BRIEF_STATUS_OPTIONS.map((bo) => (
                  <option key={`${bo}-status-filter-option`} value={bo}>
                    {bo}
                  </option>
                ))}
              </select>
              <div>
                <span>Version</span>
                <span data-testid={`${_id}-version`}>{version}</span>
              </div>
              <button
                className="border rounded bg-cyan-900 cursor-pointer p-2 hover:bg-cyan-700"
                onClick={() => handleUpdateBrief()}
                disabled={loading}
              >
                save detail changes
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BriefItem;
