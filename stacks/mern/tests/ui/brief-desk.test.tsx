/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadChallengeApp } from "../../client/src/load-challenge-app.tsx";
import type { BriefRecord, BriefSummary, Member } from "../../shared/types.ts";
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

const members: Member[] = [
  { _id: "m1", display_name: "Ava Chen", discipline: "Engineering" },
  { _id: "m2", display_name: "Ben Ortiz", discipline: "Design" },
];

const openBrief: BriefRecord = {
  _id: "b1",
  client_name: "Northline Bank",
  title: "Homepage rate table refresh",
  priority: "high",
  status: "open",
  assigned_member_id: null,
  assigned_member_name: null,
  due_at: "2026-08-10T09:00:00.000Z",
  notes: "Legal needs the APY copy updated before the campaign launch.",
  version: 1,
  updated_at: "2026-08-10T09:00:00.000Z",
};

const claimedBrief: BriefRecord = {
  ...openBrief,
  status: "claimed",
  assigned_member_id: "m1",
  assigned_member_name: "Ava Chen",
  version: 2,
};

const completedBrief: BriefRecord = {
  ...claimedBrief,
  status: "completed",
  notes: "Latest saved note",
  version: 5,
};

const searchResultBrief: BriefRecord = {
  ...openBrief,
  _id: "b5",
  client_name: "Orbit Travel",
  title: "Mobile nav overflow on iOS",
};

const openSummary: BriefSummary = { open: 1, claimed: 0, completed: 0 };
const claimedSummary: BriefSummary = { open: 0, claimed: 1, completed: 0 };

type RouteHandlers = {
  members?: () => Promise<Response> | Response;
  briefs?: (url: URL) => Promise<Response> | Response;
  summary?: () => Promise<Response> | Response;
  claim?: () => Promise<Response> | Response;
  patch?: (url: URL, init: RequestInit | undefined) => Promise<Response> | Response;
};

function installBoardFetch(handlers: RouteHandlers = {}) {
  installFetchMock((url, init) => {
    const path = url.pathname;
    const method = (init?.method ?? "GET").toUpperCase();

    if (path.endsWith("/api/members") && method === "GET") {
      return handlers.members?.() ?? jsonResponse(members);
    }
    if (path.endsWith("/api/summary") && method === "GET") {
      return handlers.summary?.() ?? jsonResponse(openSummary);
    }
    if (path.includes("/api/briefs/") && path.endsWith("/claim") && method === "POST") {
      return handlers.claim?.() ?? jsonResponse(claimedBrief);
    }
    if (path.includes("/api/briefs/") && method === "PATCH") {
      return handlers.patch?.(url, init) ?? jsonResponse(completedBrief);
    }
    if (path.endsWith("/api/briefs") && method === "GET") {
      return handlers.briefs?.(url) ?? jsonResponse([openBrief]);
    }
    return jsonResponse({ message: `Unhandled mock route: ${method} ${path}` }, 500);
  });
}

function briefFieldTestId(
  id: string,
  field: "row" | "client-name" | "title" | "priority" | "status" | "assignee",
) {
  return `${id}-brief-${field}`;
}

async function expandBrief(id: string) {
  const row = await screen.findByTestId(briefFieldTestId(id, "row"));
  await userEvent.click(within(row).getByRole("button", { name: /expand/i }));
}

async function enterEditMode(id: string) {
  await expandBrief(id);
  const row = await screen.findByTestId(briefFieldTestId(id, "row"));
  await userEvent.click(within(row).getByRole("button", { name: /edit/i }));
}

function expectBriefFields(
  id: string,
  fields: {
    clientName?: string;
    title?: string;
    priority?: string;
    status?: string;
    assignee?: string;
  },
) {
  const list = screen.getByTestId("brief-list");
  if (fields.clientName !== undefined) {
    expect(within(list).getByTestId(briefFieldTestId(id, "client-name"))).toHaveTextContent(
      fields.clientName,
    );
  }
  if (fields.title !== undefined) {
    expect(within(list).getByTestId(briefFieldTestId(id, "title"))).toHaveTextContent(fields.title);
  }
  if (fields.priority !== undefined) {
    expect(within(list).getByTestId(briefFieldTestId(id, "priority"))).toHaveTextContent(
      fields.priority,
    );
  }
  if (fields.status !== undefined) {
    expect(within(list).getByTestId(briefFieldTestId(id, "status"))).toHaveTextContent(
      fields.status,
    );
  }
  if (fields.assignee !== undefined) {
    expect(within(list).getByTestId(briefFieldTestId(id, "assignee"))).toHaveTextContent(
      fields.assignee,
    );
  }
}

describe("brief desk UI", () => {
  test("[UI] First render shows summary counts", async () => {
    installBoardFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    expect(await screen.findByTestId("summary-open")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-claimed")).toHaveTextContent("0");
    expect(screen.getByTestId("summary-completed")).toHaveTextContent("0");
  });

  test("[UI] First render shows the initial brief list", async () => {
    installBoardFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    const list = await screen.findByTestId("brief-list");
    expect(within(list).getByTestId(briefFieldTestId(openBrief._id, "title"))).toHaveTextContent(
      "Homepage rate table refresh",
    );
  });

  test("[UI] The brief list shows brief details (client name, title, priority, status, assignee) from the API response", async () => {
    installBoardFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("brief-list");
    expectBriefFields(openBrief._id, {
      clientName: "Northline Bank",
      title: "Homepage rate table refresh",
      priority: "high",
      status: "open",
      assignee: "Unassigned",
    });
  });

  test("[UI] Status filter is available", async () => {
    installBoardFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    expect(await screen.findByRole("combobox", { name: /status filter/i })).toBeInTheDocument();
  });

  test("[UI] Search filter is available", async () => {
    installBoardFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    expect(await screen.findByRole("textbox", { name: /search filter/i })).toBeInTheDocument();
  });

  test("[UI] Assignee filter is available", async () => {
    installBoardFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    expect(await screen.findByRole("combobox", { name: /assignee filter/i })).toBeInTheDocument();
  });

  test("[UI] Assignee filter lists members from the API", async () => {
    installBoardFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    const assigneeFilter = await screen.findByRole("combobox", { name: /assignee filter/i });
    expect(await within(assigneeFilter).findByRole("option", { name: "Ava Chen" })).toBeInTheDocument();
    expect(within(assigneeFilter).getByRole("option", { name: "Ben Ortiz" })).toBeInTheDocument();
  });

  test("[UI] Status filter changes the visible briefs", async () => {
    installBoardFetch({
      briefs: (url) =>
        url.searchParams.get("status") === "completed"
          ? jsonResponse([completedBrief])
          : jsonResponse([openBrief]),
    });
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("brief-list");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /status filter/i }), "completed");
    await waitFor(() => {
      expectBriefFields(completedBrief._id, { status: "completed", assignee: "Ava Chen" });
    });
  });

  test("[UI] Assignee filter changes the visible briefs", async () => {
    installBoardFetch({
      briefs: (url) =>
        url.searchParams.get("assigned_member_id") === "m1"
          ? jsonResponse([claimedBrief])
          : jsonResponse([openBrief]),
    });
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    const assigneeFilter = await screen.findByRole("combobox", { name: /assignee filter/i });
    await within(assigneeFilter).findByRole("option", { name: "Ava Chen" });
    await userEvent.selectOptions(assigneeFilter, "m1");
    await waitFor(() => {
      expectBriefFields(claimedBrief._id, { status: "claimed", assignee: "Ava Chen" });
    });
  });

  test("[UI] Search filter changes the visible briefs", async () => {
    installBoardFetch({
      briefs: (url) =>
        (url.searchParams.get("search") ?? "") === "orbit"
          ? jsonResponse([searchResultBrief])
          : jsonResponse([openBrief]),
    });
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("brief-list");
    const search = screen.getByRole("textbox", { name: /search filter/i });
    await userEvent.clear(search);
    await userEvent.type(search, "orbit");
    await waitFor(() => {
      expectBriefFields(searchResultBrief._id, {
        clientName: "Orbit Travel",
        title: "Mobile nav overflow on iOS",
      });
    });
  });

  test("[UI] Claiming a brief updates summary and shows assignee under the claimed filter", async () => {
    let summary = openSummary;
    let hasClaimed = false;
    installBoardFetch({
      claim: () => {
        hasClaimed = true;
        summary = claimedSummary;
        return jsonResponse(claimedBrief);
      },
      summary: () => jsonResponse(summary),
      briefs: (url) => {
        const status = url.searchParams.get("status");
        if (status === "claimed") {
          return jsonResponse(hasClaimed ? [claimedBrief] : []);
        }
        return jsonResponse(hasClaimed ? [] : [openBrief]);
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await expandBrief(openBrief._id);
    await userEvent.click(screen.getByRole("button", { name: /claim brief/i }));

    await waitFor(() => {
      expect(screen.getByTestId("summary-claimed")).toHaveTextContent("1");
    });
    await waitFor(() => {
      expect(screen.queryByTestId(briefFieldTestId(openBrief._id, "row"))).not.toBeInTheDocument();
    });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /status filter/i }), "claimed");
    await waitFor(() => {
      expectBriefFields(claimedBrief._id, { assignee: "Ava Chen", status: "claimed" });
    });
  });

  test("[UI] Expanding a brief shows read-only details and an Edit button", async () => {
    installBoardFetch({ briefs: () => jsonResponse([claimedBrief]) });
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await expandBrief(claimedBrief._id);
    const row = await screen.findByTestId(briefFieldTestId(claimedBrief._id, "row"));
    const detailsView = await screen.findByTestId(`${claimedBrief._id}-details-view`);
    expect(detailsView).toHaveTextContent(claimedBrief.notes);
    expect(detailsView).toHaveTextContent(claimedBrief.status);
    expect(screen.getByTestId(`${claimedBrief._id}-version`)).toHaveTextContent(
      String(claimedBrief.version),
    );
    expect(within(row).getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.queryByTestId(`${claimedBrief._id}-details-form`)).not.toBeInTheDocument();
  });

  test("[UI] Clicking Edit shows the details form (notes, details status, save)", async () => {
    installBoardFetch({ briefs: () => jsonResponse([claimedBrief]) });
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await enterEditMode(claimedBrief._id);
    expect(await screen.findByTestId(`${claimedBrief._id}-details-form`)).toBeInTheDocument();
    expect(await screen.findByTestId(`${claimedBrief._id}-notes`)).toBeInTheDocument();
    expect(screen.getByTestId(`${claimedBrief._id}-details-status`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save detail changes/i })).toBeInTheDocument();
  });

  test("[UI] The details form starts with notes and version from the selected brief", async () => {
    installBoardFetch({ briefs: () => jsonResponse([claimedBrief]) });
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await enterEditMode(claimedBrief._id);
    expect(await screen.findByTestId(`${claimedBrief._id}-notes`)).toHaveValue(claimedBrief.notes);
    expect(screen.getByTestId(`${claimedBrief._id}-version`)).toHaveTextContent(
      String(claimedBrief.version),
    );
  });

  test("[UI] A successful save reflects the draft notes, status, and version", async () => {
    const draftNotes = "Shipped after client sign-off on the rate table.";
    let listedBrief: BriefRecord = claimedBrief;
    let patchBody: unknown;

    installBoardFetch({
      briefs: () => jsonResponse([listedBrief]),
      summary: () => jsonResponse(claimedSummary),
      patch: (_url, init) => {
        patchBody = JSON.parse(String(init?.body ?? "{}"));
        const body = patchBody as {
          notes?: string;
          status?: BriefRecord["status"];
          expected_version?: number;
        };
        listedBrief = {
          ...claimedBrief,
          notes: String(body.notes ?? ""),
          status: body.status ?? claimedBrief.status,
          version: Number(claimedBrief.version) + 1,
        };
        return jsonResponse(listedBrief);
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await enterEditMode(claimedBrief._id);

    const notes = await screen.findByTestId(`${claimedBrief._id}-notes`);
    await userEvent.clear(notes);
    await userEvent.type(notes, draftNotes);
    await userEvent.selectOptions(
      screen.getByTestId(`${claimedBrief._id}-details-status`),
      "completed",
    );
    await userEvent.click(screen.getByRole("button", { name: /save detail changes/i }));

    await waitFor(() => {
      expect(patchBody).toMatchObject({
        expected_version: claimedBrief.version,
        notes: draftNotes,
        status: "completed",
      });
    });
    await waitFor(() => {
      expect(screen.getByTestId(`${claimedBrief._id}-notes`)).toHaveValue(draftNotes);
      expect(screen.getByTestId(`${claimedBrief._id}-version`)).toHaveTextContent(
        String(claimedBrief.version + 1),
      );
      expectBriefFields(claimedBrief._id, { status: "completed" });
    });
  });

  test("[UI] A 409 save shows the server message and latest notes/version", async () => {
    installBoardFetch({
      briefs: () => jsonResponse([claimedBrief]),
      patch: () =>
        jsonResponse(
          {
            message: "Your copy is stale. Refresh with the latest brief data.",
            latest: completedBrief,
          },
          409,
        ),
    });
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await enterEditMode(claimedBrief._id);
    const notes = await screen.findByTestId(`${claimedBrief._id}-notes`);
    await userEvent.clear(notes);
    await userEvent.type(notes, "Outdated browser note");
    await userEvent.click(screen.getByRole("button", { name: /save detail changes/i }));
    expect(
      await screen.findByText("Your copy is stale. Refresh with the latest brief data."),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId(`${claimedBrief._id}-notes`)).toHaveValue("Latest saved note");
    });
    expect(screen.getByTestId(`${claimedBrief._id}-version`)).toHaveTextContent("5");
  });

  test("[UI] Detail controls are disabled while a save is pending", async () => {
    const deferred = createDeferred<Response>();
    installBoardFetch({
      briefs: () => jsonResponse([claimedBrief]),
      patch: () => deferred.promise,
    });
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await enterEditMode(claimedBrief._id);
    const saveButton = await screen.findByRole("button", { name: /save detail changes/i });
    await userEvent.click(saveButton);
    expect(screen.getByTestId(`${claimedBrief._id}-details-status`)).toBeDisabled();
    expect(screen.getByTestId(`${claimedBrief._id}-notes`)).toBeDisabled();
    expect(saveButton).toBeDisabled();
    deferred.resolve(jsonResponse(completedBrief));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save detail changes/i })).toBeEnabled();
    });
  });
});
