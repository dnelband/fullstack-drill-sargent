/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadChallengeApp } from "../../client/src/load-challenge-app.tsx";
import type { MemoRecord, MemoSummary } from "../../shared/types.ts";
import { installFetchMock, jsonResponse } from "./mock-fetch.ts";

const memos: MemoRecord[] = [
  {
    _id: "n1",
    title: "Standup notes",
    body: "Ship filter desk first",
    status: "active",
    owner_id: "m1",
    owner_name: "Ava Owner",
    version: 1,
    updated_at: "2026-08-14T10:00:00.000Z",
  },
  {
    _id: "n4",
    title: "Old kickoff",
    body: "Archived on purpose",
    status: "archived",
    owner_id: "m1",
    owner_name: "Ava Owner",
    version: 3,
    updated_at: "2026-08-13T10:00:00.000Z",
  },
];

let memoState: MemoRecord[] = structuredClone(memos);
let summaryState: MemoSummary = { active: 1, archived: 1 };

function recomputeSummary() {
  summaryState = {
    active: memoState.filter((memo) => memo.status === "active").length,
    archived: memoState.filter((memo) => memo.status === "archived").length,
  };
}

function installMemoFetch(
  handlers: {
    patch?: (id: string, init?: RequestInit) => Response | Promise<Response>;
    archive?: (id: string, init?: RequestInit) => Response | Promise<Response>;
  } = {},
) {
  installFetchMock((url, init) => {
    const path = url.pathname;
    const method = (init?.method ?? "GET").toUpperCase();

    if (path.endsWith("/api/memos/summary") && method === "GET") {
      return jsonResponse(summaryState);
    }

    if (path.endsWith("/api/memos") && method === "GET") {
      const status = url.searchParams.get("status") ?? "all";
      const list =
        status === "all"
          ? memoState
          : memoState.filter((memo) => memo.status === status);
      return jsonResponse(list);
    }

    const archiveMatch = path.match(/\/api\/memos\/([^/]+)\/archive$/);
    if (archiveMatch && method === "POST") {
      const id = archiveMatch[1]!;
      if (handlers.archive) {
        return handlers.archive(id, init);
      }
      const current = memoState.find((memo) => memo._id === id);
      if (!current) {
        return jsonResponse({ message: "Memo not found." }, 404);
      }
      const updated: MemoRecord = {
        ...current,
        status: "archived",
        version: current.version + 1,
      };
      memoState = memoState.map((memo) => (memo._id === id ? updated : memo));
      recomputeSummary();
      return jsonResponse(updated);
    }

    const patchMatch = path.match(/\/api\/memos\/([^/]+)$/);
    if (patchMatch && method === "PATCH") {
      const id = patchMatch[1]!;
      if (handlers.patch) {
        return handlers.patch(id, init);
      }
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        expected_version?: number;
        body?: string;
        owner_id?: string;
      };
      const current = memoState.find((memo) => memo._id === id);
      if (!current) {
        return jsonResponse({ message: "Memo not found." }, 404);
      }
      if (current.version !== body.expected_version) {
        return jsonResponse(
          { message: "Stale version.", latest: current },
          412,
        );
      }
      const updated: MemoRecord = {
        ...current,
        body: String(body.body ?? ""),
        version: current.version + 1,
      };
      memoState = memoState.map((memo) => (memo._id === id ? updated : memo));
      return jsonResponse(updated);
    }

    return jsonResponse(
      { message: `Unhandled mock route: ${method} ${path}` },
      500,
    );
  });
}

describe("memo desk UI", () => {
  beforeEach(() => {
    memoState = structuredClone(memos);
    recomputeSummary();
  });

  test("[UI] The memo list, summary, and status filter load on first render", async () => {
    installMemoFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    expect(await screen.findByTestId("memo-list")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /status filter/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("n1-memo-title")).toHaveTextContent(
      "Standup notes",
    );
    expect(screen.getByTestId("n1-memo-status")).toHaveTextContent("active");
    expect(screen.getByTestId("summary-active")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-archived")).toHaveTextContent("1");
  });

  test("[UI] Expanding a memo, editing body, and saving reflects the draft", async () => {
    let lastPatchBody: unknown = null;
    installMemoFetch({
      patch: (id, init) => {
        lastPatchBody = JSON.parse(String(init?.body ?? "{}"));
        const body = lastPatchBody as {
          expected_version?: number;
          body?: string;
          owner_id?: string;
        };
        const current = memoState.find((memo) => memo._id === id)!;
        const updated: MemoRecord = {
          ...current,
          body: String(body.body ?? ""),
          version: (body.expected_version ?? current.version) + 1,
        };
        memoState = memoState.map((memo) => (memo._id === id ? updated : memo));
        return jsonResponse(updated);
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("memo-list");

    const row = screen.getByTestId("n1-memo-row");
    await userEvent.click(within(row).getByRole("button", { name: /expand/i }));
    expect(screen.getByTestId("n1-details-view")).toBeInTheDocument();
    expect(screen.queryByTestId("n1-details-form")).not.toBeInTheDocument();

    await userEvent.click(within(row).getByRole("button", { name: /^edit$/i }));
    const form = screen.getByTestId("n1-details-form");
    const body = within(form).getByRole("textbox", {
      name: /n1-body|body/i,
    });
    await userEvent.clear(body);
    await userEvent.type(body, "Live board notes");
    await userEvent.click(
      within(form).getByRole("button", { name: /save detail changes/i }),
    );

    await waitFor(() => {
      expect(lastPatchBody).toMatchObject({
        owner_id: "m1",
        expected_version: 1,
        body: "Live board notes",
      });
      expect(screen.getByTestId("n1-version")).toHaveTextContent("2");
      expect(screen.getByTestId("n1-details-view")).toHaveTextContent(
        "Live board notes",
      );
    });
  });

  test("[UI] A stale save shows stale-message", async () => {
    installMemoFetch({
      patch: (_id, _init) => {
        const current = memoState.find((memo) => memo._id === "n1")!;
        return jsonResponse(
          { message: "Stale version.", latest: current },
          412,
        );
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("memo-list");

    const row = screen.getByTestId("n1-memo-row");
    await userEvent.click(
      within(row).getByRole("button", { name: /^expand$/i }),
    );
    await userEvent.click(within(row).getByRole("button", { name: /^edit$/i }));
    await userEvent.click(
      within(screen.getByTestId("n1-details-form")).getByRole("button", {
        name: /save detail changes/i,
      }),
    );

    expect(await screen.findByTestId("stale-message")).toHaveTextContent(
      /stale/i,
    );
  });

  test("[UI] Archiving a memo updates the row and summary", async () => {
    installMemoFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("memo-list");

    const row = screen.getByTestId("n1-memo-row");
    await userEvent.click(
      within(row).getByRole("button", { name: /archive memo/i }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("n1-memo-status")).toHaveTextContent(
        "archived",
      );
      expect(screen.getByTestId("summary-active")).toHaveTextContent("0");
      expect(screen.getByTestId("summary-archived")).toHaveTextContent("2");
    });
  });
});
