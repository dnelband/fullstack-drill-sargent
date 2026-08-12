/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadChallengeApp } from "../../client/src/load-challenge-app.tsx";
import type { HoldQueueItem, HoldQueueSummary } from "../../shared/types.ts";
import { installFetchMock, jsonResponse } from "./mock-fetch.ts";

const items: HoldQueueItem[] = [
  {
    _id: "q1",
    title: "Printer jam floor 2",
    priority: "high",
    status: "open",
    held_by_id: null,
    held_by_name: null,
    held_until: null,
    notes: "",
    version: 1,
    created_at: "2026-08-12T14:00:00.000Z",
  },
  {
    _id: "q2",
    title: "Badge reader offline",
    priority: "medium",
    status: "open",
    held_by_id: null,
    held_by_name: null,
    held_until: null,
    notes: "",
    version: 1,
    created_at: "2026-08-12T13:00:00.000Z",
  },
  {
    _id: "q5",
    title: "Conference dial-in noise",
    priority: "medium",
    status: "held",
    held_by_id: "m1",
    held_by_name: "Ava Agent",
    held_until: "2099-01-01T00:00:00.000Z",
    notes: "Testing mics",
    version: 3,
    created_at: "2026-08-12T10:00:00.000Z",
  },
];

let itemState: HoldQueueItem[] = structuredClone(items);
let summaryState: HoldQueueSummary = { open: 2, held: 1 };

function recomputeSummary() {
  summaryState = {
    open: itemState.filter((item) => item.status === "open").length,
    held: itemState.filter((item) => item.status === "held").length,
  };
}

function installQueueFetch(
  handlers: {
    hold?: (id: string, init?: RequestInit) => Response | Promise<Response>;
    patch?: (id: string, init?: RequestInit) => Response | Promise<Response>;
  } = {},
) {
  installFetchMock((url, init) => {
    const path = url.pathname;
    const method = (init?.method ?? "GET").toUpperCase();

    if (path.endsWith("/api/queue/summary") && method === "GET") {
      return jsonResponse(summaryState);
    }

    if (path.endsWith("/api/queue") && method === "GET") {
      const status = url.searchParams.get("status") ?? "all";
      const list =
        status === "all"
          ? itemState
          : itemState.filter((item) => item.status === status);
      return jsonResponse(list);
    }

    const holdMatch = path.match(/\/api\/queue\/([^/]+)\/hold$/);
    if (holdMatch && method === "POST") {
      const id = holdMatch[1]!;
      if (handlers.hold) {
        return handlers.hold(id, init);
      }
      const current = itemState.find((item) => item._id === id);
      if (!current) {
        return jsonResponse({ message: "Item not found." }, 404);
      }
      if (current.status === "held") {
        return jsonResponse(
          { message: "Item is actively held.", latest: current },
          409,
        );
      }
      const updated: HoldQueueItem = {
        ...current,
        status: "held",
        held_by_id: "m1",
        held_by_name: "Ava Agent",
        held_until: "2099-01-01T00:00:00.000Z",
        version: current.version + 1,
      };
      itemState = itemState.map((item) => (item._id === id ? updated : item));
      recomputeSummary();
      return jsonResponse(updated);
    }

    const patchMatch = path.match(/\/api\/queue\/([^/]+)$/);
    if (patchMatch && method === "PATCH") {
      const id = patchMatch[1]!;
      if (handlers.patch) {
        return handlers.patch(id, init);
      }
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        expected_version?: number;
        notes?: string;
        member_id?: string;
      };
      const current = itemState.find((item) => item._id === id);
      if (!current) {
        return jsonResponse({ message: "Item not found." }, 404);
      }
      if (current.version !== body.expected_version) {
        return jsonResponse(
          { message: "Stale version.", latest: current },
          412,
        );
      }
      const updated: HoldQueueItem = {
        ...current,
        notes: String(body.notes ?? current.notes),
        version: current.version + 1,
      };
      itemState = itemState.map((item) => (item._id === id ? updated : item));
      return jsonResponse(updated);
    }

    return jsonResponse({ message: `Unhandled mock route: ${method} ${path}` }, 500);
  });
}

describe("hold queue UI", () => {
  beforeEach(() => {
    itemState = structuredClone(items);
    recomputeSummary();
  });

  test("[UI] The queue list and summary load on first render", async () => {
    installQueueFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    expect(await screen.findByTestId("queue-list")).toBeInTheDocument();
    expect(screen.getByTestId("q1-queue-title")).toHaveTextContent(
      "Printer jam floor 2",
    );
    expect(screen.getByTestId("q1-queue-status")).toHaveTextContent("open");
    expect(screen.getByTestId("q5-queue-holder")).toHaveTextContent("Ava Agent");
    expect(screen.getByTestId("summary-open")).toHaveTextContent("2");
    expect(screen.getByTestId("summary-held")).toHaveTextContent("1");
  });

  test("[UI] Holding an item updates the row and summary", async () => {
    installQueueFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("queue-list");

    const row = screen.getByTestId("q1-queue-row");
    await userEvent.click(within(row).getByRole("button", { name: /hold item/i }));

    await waitFor(() => {
      expect(screen.getByTestId("q1-queue-status")).toHaveTextContent("held");
      expect(screen.getByTestId("q1-queue-holder")).toHaveTextContent("Ava Agent");
      expect(screen.getByTestId("summary-open")).toHaveTextContent("1");
      expect(screen.getByTestId("summary-held")).toHaveTextContent("2");
    });
  });

  test("[UI] A lost hold shows the conflict message and refetches the list", async () => {
    installQueueFetch({
      hold: (id) => {
        const current = itemState.find((item) => item._id === id)!;
        const latest: HoldQueueItem = {
          ...current,
          status: "held",
          held_by_id: "m2",
          held_by_name: "Ben Agent",
          held_until: "2099-01-01T00:00:00.000Z",
          version: current.version + 1,
        };
        itemState = itemState.map((item) => (item._id === id ? latest : item));
        recomputeSummary();
        return jsonResponse(
          { message: "Item is actively held.", latest },
          409,
        );
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("queue-list");

    const row = screen.getByTestId("q1-queue-row");
    await userEvent.click(within(row).getByRole("button", { name: /hold item/i }));

    expect(await screen.findByTestId("conflict-message")).toHaveTextContent(
      /actively held|already held|no longer available/i,
    );
    await waitFor(() => {
      expect(screen.getByTestId("q1-queue-status")).toHaveTextContent("held");
      expect(screen.getByTestId("q1-queue-holder")).toHaveTextContent("Ben Agent");
    });
  });

  test("[UI] Expanding a held item, editing notes, and saving reflects the draft", async () => {
    let lastPatchBody: unknown = null;
    installQueueFetch({
      patch: (id, init) => {
        lastPatchBody = JSON.parse(String(init?.body ?? "{}"));
        const body = lastPatchBody as {
          expected_version?: number;
          notes?: string;
          member_id?: string;
        };
        const current = itemState.find((item) => item._id === id)!;
        const updated: HoldQueueItem = {
          ...current,
          notes: String(body.notes ?? ""),
          version: (body.expected_version ?? current.version) + 1,
        };
        itemState = itemState.map((item) => (item._id === id ? updated : item));
        return jsonResponse(updated);
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("queue-list");

    const row = screen.getByTestId("q5-queue-row");
    await userEvent.click(within(row).getByRole("button", { name: /expand/i }));
    expect(screen.getByTestId("q5-details-view")).toBeInTheDocument();
    expect(screen.queryByTestId("q5-details-form")).not.toBeInTheDocument();

    await userEvent.click(within(row).getByRole("button", { name: /^edit$/i }));
    const form = screen.getByTestId("q5-details-form");
    const notes = within(form).getByRole("textbox", { name: /q5-notes|notes/i });
    await userEvent.clear(notes);
    await userEvent.type(notes, "Replaced headset");
    await userEvent.click(
      within(form).getByRole("button", { name: /save detail changes/i }),
    );

    await waitFor(() => {
      expect(lastPatchBody).toMatchObject({
        member_id: "m1",
        expected_version: 3,
        notes: "Replaced headset",
      });
      expect(screen.getByTestId("q5-version")).toHaveTextContent("4");
    });
    expect(screen.getByTestId("q5-details-view")).toHaveTextContent(
      "Replaced headset",
    );
  });
});
