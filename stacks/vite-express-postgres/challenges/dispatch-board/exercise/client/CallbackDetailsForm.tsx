import React, { useEffect, useState } from "react";
import {
  CallbackRecord,
  CallbackStatus,
  CallbackUpdateFields,
} from "../../../../shared/types";

const statusOptions = ["open", "claimed", "completed"];

const CallbackDetailsForm = ({
  callback,
  onSubmit,
}: {
  callback: CallbackRecord;
  onSubmit: (latest?: CallbackRecord) => void;
}) => {
  const handleUpdateCallback = (updateFields: CallbackUpdateFields) => {
    async function updateCallback() {
      setLoading(true);
      const { id, notes, status, version } = updateFields;
      const res = await fetch(`http://localhost:4010/api/callbacks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify({ notes, status, expected_version: version }),
      });
      let latest;
      if (res.status === 409) {
        const data = await res.json();
        setError(data.message);
        latest = data.latest;
      }

      onSubmit(latest);
      setLoading(false);
    }
    void updateCallback();
  };

  const [notes, setNotes] = useState(callback.notes);
  const [status, setStatus] = useState(callback.status);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNotes(callback.notes);
    setStatus(callback.status);
  }, [callback]);

  return (
    <div
      data-testid={`${callback.id}-details-form`}
      className="flex flex-col gap-2 p-2 border rounded"
    >
      {error}
      <input
        disabled={loading}
        data-testid={`${callback.id}-notes`}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="border rounded p-2"
      />
      <select
        disabled={loading}
        onChange={(e) => setStatus(e.target.value as CallbackStatus)}
        value={status}
        data-testid={`${callback.id}-details-status`}
        className="border rounded p-2"
      >
        {statusOptions.map((opt) => (
          <option value={opt}>{opt}</option>
        ))}
      </select>
      <span data-testid={`${callback.id}-version`}>{callback.version}</span>
      <div className="flex flex-row-reverse">
        <button
          disabled={loading}
          type="submit"
          className="border rounded p-1 px-2 bg-cyan-900 cursor-pointer"
          onClick={() =>
            handleUpdateCallback({
              id: callback.id,
              notes,
              status,
              version: callback.version,
            })
          }
        >
          Save detail changes
        </button>
      </div>
    </div>
  );
};

export default CallbackDetailsForm;
