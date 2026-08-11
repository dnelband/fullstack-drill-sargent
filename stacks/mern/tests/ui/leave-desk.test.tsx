/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadChallengeApp } from "../../client/src/load-challenge-app.tsx";
import type { LeaveBalance, LeaveRequest, LeaveUser } from "../../shared/types.ts";
import { installFetchMock, jsonResponse } from "./mock-fetch.ts";

const users: LeaveUser[] = [
  { _id: "u1", display_name: "Ava Employee", role: "employee" },
  { _id: "u2", display_name: "Morgan Manager", role: "manager" },
  { _id: "u3", display_name: "Sam Employee", role: "employee" },
];

const balanceU1: LeaveBalance = {
  _id: "bal-u1",
  user_id: "u1",
  annual_days: 20,
  sick_days: 10,
};

const balanceU3: LeaveBalance = {
  _id: "bal-u3",
  user_id: "u3",
  annual_days: 15,
  sick_days: 5,
};

const leaveOne: LeaveRequest = {
  _id: "lr1",
  user_id: "u1",
  user_name: "Ava Employee",
  type: "annual",
  status: "pending",
  start_date: "2026-09-01",
  end_date: "2026-09-03",
  days: 3,
  notes: "Family trip",
  version: 1,
  updated_at: "2026-08-01T12:00:00.000Z",
  reviewed_by_id: null,
  reviewed_at: null,
};

const leaveTwo: LeaveRequest = {
  _id: "lr3",
  user_id: "u3",
  user_name: "Sam Employee",
  type: "unpaid",
  status: "pending",
  start_date: "2026-09-05",
  end_date: "2026-09-06",
  days: 2,
  notes: "Personal",
  version: 1,
  updated_at: "2026-08-01T12:20:00.000Z",
  reviewed_by_id: null,
  reviewed_at: null,
};

function installLeaveFetch(handlers: {
  users?: () => Response | Promise<Response>;
  balance?: (userId: string) => Response | Promise<Response>;
  list?: (url: URL) => Response | Promise<Response>;
  create?: (init: RequestInit | undefined) => Response | Promise<Response>;
  patch?: (id: string, init: RequestInit | undefined) => Response | Promise<Response>;
  approve?: (id: string, init: RequestInit | undefined) => Response | Promise<Response>;
  reject?: (id: string, init: RequestInit | undefined) => Response | Promise<Response>;
} = {}) {
  installFetchMock((url, init) => {
    const path = url.pathname;
    const method = (init?.method ?? "GET").toUpperCase();

    if (path.endsWith("/api/users") && method === "GET") {
      return handlers.users?.() ?? jsonResponse(users);
    }

    if (path.endsWith("/api/leave-balance") && method === "GET") {
      const userId = url.searchParams.get("user_id") ?? "";
      return (
        handlers.balance?.(userId) ??
        (userId === "u3"
          ? jsonResponse(balanceU3)
          : userId === "u1"
            ? jsonResponse(balanceU1)
            : jsonResponse({
                _id: `bal-${userId}`,
                user_id: userId,
                annual_days: 0,
                sick_days: 0,
              }))
      );
    }

    if (path.endsWith("/api/leave-requests") && method === "GET") {
      return handlers.list?.(url) ?? jsonResponse([leaveOne, leaveTwo]);
    }

    if (path.endsWith("/api/leave-requests") && method === "POST") {
      return (
        handlers.create?.(init) ??
        jsonResponse({
          ...leaveOne,
          _id: "lr-new",
          start_date: "2026-11-01",
          end_date: "2026-11-02",
          days: 2,
          notes: "New",
        })
      );
    }

    const approveMatch = path.match(/\/api\/leave-requests\/([^/]+)\/approve$/);
    if (approveMatch && method === "POST") {
      return (
        handlers.approve?.(approveMatch[1], init) ??
        jsonResponse({ ...leaveOne, status: "approved", version: 2, reviewed_by_id: "u2" })
      );
    }

    const rejectMatch = path.match(/\/api\/leave-requests\/([^/]+)\/reject$/);
    if (rejectMatch && method === "POST") {
      return (
        handlers.reject?.(rejectMatch[1], init) ??
        jsonResponse({ ...leaveOne, status: "rejected", version: 2, reviewed_by_id: "u2" })
      );
    }

    const patchMatch = path.match(/\/api\/leave-requests\/([^/]+)$/);
    if (patchMatch && method === "PATCH") {
      return (
        handlers.patch?.(patchMatch[1], init) ??
        jsonResponse({ ...leaveOne, notes: "Updated", version: 2 })
      );
    }

    return jsonResponse({ message: `Unhandled mock route: ${method} ${path}` }, 500);
  });
}

async function expandLeave(row: HTMLElement) {
  await userEvent.click(within(row).getByRole("button", { name: /expand/i }));
}

async function enterEditMode(row: HTMLElement) {
  await expandLeave(row);
  await userEvent.click(within(row).getByRole("button", { name: /^edit$/i }));
}

describe("leave desk UI", () => {
  test("[UI] The leave list and balance load on first render", async () => {
    installLeaveFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    expect(await screen.findByTestId("leave-list")).toBeInTheDocument();
    expect(screen.getByTestId("lr1-leave-user-name")).toHaveTextContent("Ava Employee");
    expect(screen.getByTestId("balance-annual")).toHaveTextContent("20");
    expect(screen.getByTestId("balance-sick")).toHaveTextContent("10");
  });

  test("[UI] Acting as another user reloads balance and list", async () => {
    installLeaveFetch({
      list: (url) => {
        const userId = url.searchParams.get("user_id");
        if (userId === "u3") {
          return jsonResponse([leaveTwo]);
        }
        return jsonResponse([leaveOne, leaveTwo]);
      },
    });
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("leave-list");

    await userEvent.selectOptions(screen.getByRole("combobox", { name: /acting as/i }), "u3");

    await waitFor(() => {
      expect(screen.getByTestId("balance-annual")).toHaveTextContent("15");
      expect(screen.queryByTestId("lr1-leave-row")).not.toBeInTheDocument();
      expect(screen.getByTestId("lr3-leave-row")).toBeInTheDocument();
    });
  });

  test("[UI] Submitting a leave request adds it to the list", async () => {
    let listed: LeaveRequest[] = [leaveOne];
    installLeaveFetch({
      list: () => jsonResponse(listed),
      create: (init) => {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          type: LeaveRequest["type"];
          start_date: string;
          end_date: string;
          notes: string;
        };
        const created: LeaveRequest = {
          _id: "lr-new",
          user_id: "u1",
          user_name: "Ava Employee",
          type: body.type,
          status: "pending",
          start_date: body.start_date,
          end_date: body.end_date,
          days: 2,
          notes: body.notes,
          version: 1,
          updated_at: "2026-08-01T13:00:00.000Z",
          reviewed_by_id: null,
          reviewed_at: null,
        };
        listed = [...listed, created];
        return jsonResponse(created);
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("leave-list");
    expect(screen.getByTestId("leave-request-form")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: /^type$/i }), "annual");
    await userEvent.type(screen.getByLabelText(/start date/i), "2026-11-01");
    await userEvent.type(screen.getByLabelText(/end date/i), "2026-11-02");
    await userEvent.type(screen.getByLabelText(/^notes$/i), "Long weekend");
    await userEvent.click(screen.getByRole("button", { name: /submit leave request/i }));

    expect(await screen.findByTestId("lr-new-leave-row")).toBeInTheDocument();
    expect(screen.getByTestId("lr-new-leave-dates")).toHaveTextContent("2026-11-01");
  });

  test("[UI] Expanding a request shows read-only details and an Edit button", async () => {
    installLeaveFetch({ list: () => jsonResponse([leaveOne]) });
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("leave-list");
    const row = screen.getByTestId("lr1-leave-row");
    expect(screen.queryByTestId("lr1-details-form")).not.toBeInTheDocument();
    await expandLeave(row);
    expect(screen.getByTestId("lr1-details-view")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.queryByTestId("lr1-details-form")).not.toBeInTheDocument();
  });

  test("[UI] Clicking Edit shows the details form", async () => {
    installLeaveFetch({ list: () => jsonResponse([leaveOne]) });
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("leave-list");
    const row = screen.getByTestId("lr1-leave-row");
    await enterEditMode(row);
    expect(screen.getByTestId("lr1-details-form")).toBeInTheDocument();
    expect(screen.getByTestId("lr1-type")).toBeInTheDocument();
    expect(screen.getByTestId("lr1-start-date")).toBeInTheDocument();
    expect(screen.getByTestId("lr1-end-date")).toBeInTheDocument();
    expect(screen.getByTestId("lr1-notes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save detail changes/i })).toBeInTheDocument();
  });

  test("[UI] A successful save sends draft fields and reflects the new version", async () => {
    let body: unknown;
    let listed: LeaveRequest[] = [leaveOne];
    installLeaveFetch({
      list: () => jsonResponse(listed),
      patch: (_id, init) => {
        body = JSON.parse(String(init?.body ?? "{}"));
        const input = body as {
          type: LeaveRequest["type"];
          start_date: string;
          end_date: string;
          notes: string;
          expected_version: number;
        };
        const updated: LeaveRequest = {
          ...leaveOne,
          type: input.type,
          start_date: input.start_date,
          end_date: input.end_date,
          notes: input.notes,
          days: 2,
          version: input.expected_version + 1,
        };
        listed = listed.map((item) => (item._id === updated._id ? updated : item));
        return jsonResponse(updated);
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("leave-list");
    const row = screen.getByTestId("lr1-leave-row");
    await enterEditMode(row);

    const notesInput = screen.getByTestId("lr1-notes");
    await userEvent.clear(notesInput);
    await userEvent.type(notesInput, "Updated notes");
    const startInput = screen.getByTestId("lr1-start-date");
    const endInput = screen.getByTestId("lr1-end-date");
    await userEvent.clear(startInput);
    await userEvent.type(startInput, "2026-09-10");
    await userEvent.clear(endInput);
    await userEvent.type(endInput, "2026-09-11");
    await userEvent.click(screen.getByRole("button", { name: /save detail changes/i }));

    await waitFor(() => {
      const expected = {
        expected_version: 1,
        notes: "Updated notes",
        start_date: "2026-09-10",
        end_date: "2026-09-11",
      };
      expect(
        body,
        `actual=${JSON.stringify(body, null, 2)}\nexpected=${JSON.stringify(expected, null, 2)}`,
      ).toMatchObject(expected);
    });
    expect(await screen.findByTestId("lr1-leave-version")).toHaveTextContent("v2");
    expect(screen.getByTestId("lr1-leave-dates")).toHaveTextContent("2026-09-10");
  });

  test("[UI] A conflict shows the conflict message and applies latest when present", async () => {
    const latest: LeaveRequest = {
      ...leaveOne,
      notes: "Server notes",
      version: 4,
    };
    installLeaveFetch({
      list: () => jsonResponse([leaveOne]),
      patch: () =>
        jsonResponse(
          {
            message: "Leave request was updated elsewhere.",
            latest,
          },
          412,
        ),
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("leave-list");
    const row = screen.getByTestId("lr1-leave-row");
    await enterEditMode(row);
    await userEvent.click(screen.getByRole("button", { name: /save detail changes/i }));

    expect(await screen.findByTestId("conflict-message")).toHaveTextContent(
      /leave request was updated elsewhere/i,
    );
    expect(screen.getByTestId("lr1-leave-version")).toHaveTextContent("v4");
  });

  test("[UI] Approving a request updates status and balance", async () => {
    let listed: LeaveRequest[] = [leaveOne];
    let balance = { ...balanceU1 };
    installLeaveFetch({
      list: (url) => {
        const userId = url.searchParams.get("user_id");
        if (userId === "u1") {
          return jsonResponse(listed.filter((item) => item.user_id === "u1"));
        }
        return jsonResponse(listed);
      },
      balance: (userId) => {
        if (userId === "u1") {
          return jsonResponse(balance);
        }
        return jsonResponse({
          _id: `bal-${userId}`,
          user_id: userId,
          annual_days: 0,
          sick_days: 0,
        });
      },
      approve: () => {
        const updated: LeaveRequest = {
          ...leaveOne,
          status: "approved",
          version: 2,
          reviewed_by_id: "u2",
          reviewed_at: "2026-08-01T13:00:00.000Z",
        };
        listed = [updated];
        balance = { ...balance, annual_days: 17 };
        return jsonResponse(updated);
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("leave-list");

    await userEvent.selectOptions(screen.getByRole("combobox", { name: /acting as/i }), "u2");
    await waitFor(() => {
      expect(screen.getByTestId("lr1-leave-row")).toBeInTheDocument();
    });

    const row = screen.getByTestId("lr1-leave-row");
    await enterEditMode(row);
    await userEvent.click(screen.getByRole("button", { name: /approve leave/i }));

    await waitFor(() => {
      expect(screen.getByTestId("lr1-leave-status")).toHaveTextContent("approved");
    });

    await userEvent.selectOptions(screen.getByRole("combobox", { name: /acting as/i }), "u1");
    await waitFor(() => {
      expect(screen.getByTestId("balance-annual")).toHaveTextContent("17");
    });
  });
});
