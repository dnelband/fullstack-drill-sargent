/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadChallengeApp } from "../../client/src/load-challenge-app.tsx";
import type { Agent, CallbackRecord, CallbackSummary } from "../../shared/types.ts";
import { installFetchMock, jsonResponse } from "./mock-fetch.ts";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

const agents: Agent[] = [
  { id: "a1", display_name: "Nina Patel", team: "Ops" },
  { id: "a2", display_name: "Marco Silva", team: "Ops" },
];

const openCallback: CallbackRecord = {
  id: 1,
  customer_name: "Acme Logistics",
  topic: "Invoice mismatch",
  priority: "high",
  status: "open",
  assigned_agent_id: null,
  assigned_agent_name: null,
  scheduled_for: "2026-08-04T08:00:00.000Z",
  notes: "Original note",
  version: 1,
  updated_at: "2026-08-04T08:00:00.000Z",
};

const claimedCallback: CallbackRecord = {
  ...openCallback,
  status: "claimed",
  assigned_agent_id: "a1",
  assigned_agent_name: "Nina Patel",
  version: 2,
};

const completedCallback: CallbackRecord = {
  ...claimedCallback,
  status: "completed",
  notes: "Latest saved note",
  version: 5,
};

const searchResultCallback: CallbackRecord = {
  ...openCallback,
  id: 2,
  customer_name: "Delta Home Goods",
  topic: "Delivery reschedule",
};

const openSummary: CallbackSummary = { open: 1, claimed: 0, completed: 0 };
const claimedSummary: CallbackSummary = { open: 0, claimed: 1, completed: 0 };

type RouteHandlers = {
  agents?: () => Promise<Response> | Response;
  callbacks?: (url: URL) => Promise<Response> | Response;
  summary?: () => Promise<Response> | Response;
  claim?: () => Promise<Response> | Response;
  patch?: () => Promise<Response> | Response;
};

function installBoardFetch(handlers: RouteHandlers = {}) {
  installFetchMock((url, init) => {
    const path = url.pathname;
    const method = (init?.method ?? "GET").toUpperCase();

    if (path.endsWith("/api/agents") && method === "GET") {
      return handlers.agents?.() ?? jsonResponse(agents);
    }

    if (path.endsWith("/api/summary") && method === "GET") {
      return handlers.summary?.() ?? jsonResponse(openSummary);
    }

    if (path.includes("/api/callbacks/") && path.endsWith("/claim") && method === "POST") {
      return handlers.claim?.() ?? jsonResponse(claimedCallback);
    }

    if (path.includes("/api/callbacks/") && method === "PATCH") {
      return handlers.patch?.() ?? jsonResponse(completedCallback);
    }

    if (path.endsWith("/api/callbacks") && method === "GET") {
      return handlers.callbacks?.(url) ?? jsonResponse([openCallback]);
    }

    return jsonResponse({ message: `Unhandled mock route: ${method} ${path}` }, 500);
  });
}

function queryList() {
  return screen.getByTestId("callback-list");
}

function callbackFieldTestId(
  id: number,
  field: "row" | "customer-name" | "topic" | "priority" | "status" | "assignee",
) {
  return `${id}-callback-${field}`;
}

async function expandCallback(id: number) {
  const row = await screen.findByTestId(callbackFieldTestId(id, "row"));
  await userEvent.click(within(row).getByRole("button", { name: /expand/i }));
}

async function enterEditMode(id: number) {
  await expandCallback(id);
  const row = await screen.findByTestId(callbackFieldTestId(id, "row"));
  await userEvent.click(within(row).getByRole("button", { name: /edit/i }));
}

function expectCallbackFields(
  id: number,
  fields: {
    customerName?: string;
    topic?: string;
    priority?: string;
    status?: string;
    assignee?: string;
  },
) {
  const list = queryList();

  if (fields.customerName !== undefined) {
    expect(within(list).getByTestId(callbackFieldTestId(id, "customer-name"))).toHaveTextContent(
      fields.customerName,
    );
  }
  if (fields.topic !== undefined) {
    expect(within(list).getByTestId(callbackFieldTestId(id, "topic"))).toHaveTextContent(
      fields.topic,
    );
  }
  if (fields.priority !== undefined) {
    expect(within(list).getByTestId(callbackFieldTestId(id, "priority"))).toHaveTextContent(
      fields.priority,
    );
  }
  if (fields.status !== undefined) {
    expect(within(list).getByTestId(callbackFieldTestId(id, "status"))).toHaveTextContent(
      fields.status,
    );
  }
  if (fields.assignee !== undefined) {
    expect(within(list).getByTestId(callbackFieldTestId(id, "assignee"))).toHaveTextContent(
      fields.assignee,
    );
  }
}

describe("dispatch board UI", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  test("[UI] First render shows summary counts", async () => {
    installBoardFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    expect(await screen.findByTestId("summary-open")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-claimed")).toHaveTextContent("0");
    expect(screen.getByTestId("summary-completed")).toHaveTextContent("0");
  });

  test("[UI] First render shows the initial callback list", async () => {
    installBoardFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    const list = await screen.findByTestId("callback-list");
    expect(
      within(list).getByTestId(callbackFieldTestId(openCallback.id, "topic")),
    ).toHaveTextContent("Invoice mismatch");
  });

  test("[UI] The callback list shows callback details (customer name, topic, priority, status, assignee) from the API response", async () => {
    installBoardFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    await screen.findByTestId("callback-list");
    expectCallbackFields(openCallback.id, {
      customerName: "Acme Logistics",
      topic: "Invoice mismatch",
      priority: "high",
      status: "open",
      assignee: "Unassigned",
    });
  });

  test("[UI] Status filter is available", async () => {
    installBoardFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    expect(
      await screen.findByRole("combobox", { name: /status filter/i }),
    ).toBeInTheDocument();
  });

  test("[UI] Search filter is available", async () => {
    installBoardFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    expect(
      await screen.findByRole("textbox", { name: /search filter/i }),
    ).toBeInTheDocument();
  });

  test("[UI] Assignee filter is available", async () => {
    installBoardFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    expect(
      await screen.findByRole("combobox", { name: /assignee filter/i }),
    ).toBeInTheDocument();
  });

  test("[UI] Assignee filter lists agents from the API", async () => {
    installBoardFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    const assigneeFilter = await screen.findByRole("combobox", {
      name: /assignee filter/i,
    });

    expect(
      await within(assigneeFilter).findByRole("option", { name: "Nina Patel" }),
    ).toBeInTheDocument();
    expect(
      within(assigneeFilter).getByRole("option", { name: "Marco Silva" }),
    ).toBeInTheDocument();
  });

  test("[UI] Status filter changes the visible callbacks", async () => {
    installBoardFetch({
      callbacks: (url) => {
        const status = url.searchParams.get("status");
        return status === "completed"
          ? jsonResponse([completedCallback])
          : jsonResponse([openCallback]);
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    await screen.findByTestId("callback-list");
    expectCallbackFields(openCallback.id, {
      topic: "Invoice mismatch",
      status: "open",
    });

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /status filter/i }),
      "completed",
    );

    await waitFor(() => {
      expectCallbackFields(completedCallback.id, {
        status: "completed",
        assignee: "Nina Patel",
      });
    });
  });

  test("[UI] Assignee filter changes the visible callbacks", async () => {
    installBoardFetch({
      callbacks: (url) => {
        const assignedAgentId = url.searchParams.get("assigned_agent_id");
        return assignedAgentId === "a1"
          ? jsonResponse([claimedCallback])
          : jsonResponse([openCallback]);
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    const assigneeFilter = await screen.findByRole("combobox", {
      name: /assignee filter/i,
    });
    await within(assigneeFilter).findByRole("option", { name: "Nina Patel" });
    await userEvent.selectOptions(assigneeFilter, "a1");

    await waitFor(() => {
      expectCallbackFields(claimedCallback.id, {
        status: "claimed",
        assignee: "Nina Patel",
      });
    });
  });

  test("[UI] Search filter changes the visible callbacks", async () => {
    installBoardFetch({
      callbacks: (url) => {
        const search = url.searchParams.get("search") ?? "";
        return search === "delta"
          ? jsonResponse([searchResultCallback])
          : jsonResponse([openCallback]);
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    await screen.findByTestId("callback-list");
    const search = screen.getByRole("textbox", { name: /search filter/i });
    await userEvent.clear(search);
    await userEvent.type(search, "delta");

    await waitFor(() => {
      expectCallbackFields(searchResultCallback.id, {
        customerName: "Delta Home Goods",
        topic: "Delivery reschedule",
      });
    });
  });

  test("[UI] Claiming a callback updates summary and shows assignee under the claimed filter", async () => {
    let summary = openSummary;
    let hasClaimed = false;

    installBoardFetch({
      claim: () => {
        hasClaimed = true;
        summary = claimedSummary;
        return jsonResponse(claimedCallback);
      },
      summary: () => jsonResponse(summary),
      callbacks: (url) => {
        const status = url.searchParams.get("status");
        if (status === "claimed") {
          return jsonResponse(hasClaimed ? [claimedCallback] : []);
        }
        return jsonResponse(hasClaimed ? [] : [openCallback]);
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    await expandCallback(openCallback.id);
    await userEvent.click(screen.getByRole("button", { name: /claim callback/i }));

    await waitFor(() => {
      expect(screen.getByTestId("summary-claimed")).toHaveTextContent("1");
    });
    await waitFor(() => {
      expect(
        screen.queryByTestId(callbackFieldTestId(openCallback.id, "row")),
      ).not.toBeInTheDocument();
    });

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /status filter/i }),
      "claimed",
    );

    await waitFor(() => {
      expectCallbackFields(claimedCallback.id, {
        assignee: "Nina Patel",
        status: "claimed",
      });
    });
  });

  test("[UI] Expanding a callback shows read-only details and an Edit button", async () => {
    installBoardFetch({
      callbacks: () => jsonResponse([claimedCallback]),
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    await expandCallback(claimedCallback.id);

    const row = await screen.findByTestId(callbackFieldTestId(claimedCallback.id, "row"));
    const detailsView = await screen.findByTestId(`${claimedCallback.id}-details-view`);
    expect(detailsView).toHaveTextContent(claimedCallback.notes);
    expect(detailsView).toHaveTextContent(claimedCallback.status);
    expect(screen.getByTestId(`${claimedCallback.id}-version`)).toHaveTextContent(
      String(claimedCallback.version),
    );
    expect(within(row).getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.queryByTestId(`${claimedCallback.id}-details-form`)).not.toBeInTheDocument();
  });

  test("[UI] Clicking Edit shows the details form (notes, details status, save)", async () => {
    installBoardFetch({
      callbacks: () => jsonResponse([claimedCallback]),
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    await enterEditMode(claimedCallback.id);

    expect(await screen.findByTestId(`${claimedCallback.id}-details-form`)).toBeInTheDocument();
    expect(await screen.findByTestId(`${claimedCallback.id}-notes`)).toBeInTheDocument();
    expect(screen.getByTestId(`${claimedCallback.id}-details-status`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save detail changes/i })).toBeInTheDocument();
  });

  test("[UI] The details form starts with notes and version from the selected callback", async () => {
    installBoardFetch({
      callbacks: () => jsonResponse([claimedCallback]),
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    await enterEditMode(claimedCallback.id);

    expect(await screen.findByTestId(`${claimedCallback.id}-notes`)).toHaveValue(
      claimedCallback.notes,
    );
    expect(screen.getByTestId(`${claimedCallback.id}-version`)).toHaveTextContent(
      String(claimedCallback.version),
    );
  });

  test("[UI] A 409 save shows the server message and latest notes/version", async () => {
    installBoardFetch({
      callbacks: () => jsonResponse([claimedCallback]),
      patch: () =>
        jsonResponse(
          {
            message: "Your copy is stale. Refresh with the latest callback data.",
            latest: completedCallback,
          },
          409,
        ),
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    await enterEditMode(claimedCallback.id);

    const notes = await screen.findByTestId(`${claimedCallback.id}-notes`);
    await userEvent.clear(notes);
    await userEvent.type(notes, "Outdated browser note");
    await userEvent.click(screen.getByRole("button", { name: /save detail changes/i }));

    expect(
      await screen.findByText("Your copy is stale. Refresh with the latest callback data."),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId(`${claimedCallback.id}-notes`)).toHaveValue("Latest saved note");
    });
    expect(screen.getByTestId(`${claimedCallback.id}-version`)).toHaveTextContent("5");
  });

  test("[UI] Detail controls are disabled while a save is pending", async () => {
    const deferred = createDeferred<Response>();

    installBoardFetch({
      callbacks: () => jsonResponse([claimedCallback]),
      patch: () => deferred.promise,
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    await enterEditMode(claimedCallback.id);

    const saveButton = await screen.findByRole("button", { name: /save detail changes/i });
    await userEvent.click(saveButton);

    expect(screen.getByTestId(`${claimedCallback.id}-details-status`)).toBeDisabled();
    expect(screen.getByTestId(`${claimedCallback.id}-notes`)).toBeDisabled();
    expect(saveButton).toBeDisabled();

    deferred.resolve(jsonResponse(completedCallback));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save detail changes/i })).toBeEnabled();
    });
  });

});
