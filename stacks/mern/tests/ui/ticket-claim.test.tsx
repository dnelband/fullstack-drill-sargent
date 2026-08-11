/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadChallengeApp } from "../../client/src/load-challenge-app.tsx";
import type { TicketRecord, TicketSummary } from "../../shared/types.ts";
import { installFetchMock, jsonResponse } from "./mock-fetch.ts";

const tickets: TicketRecord[] = [
  {
    _id: "t1",
    title: "Password reset loop",
    priority: "high",
    status: "open",
    claimed_by_id: null,
    claimed_by_name: null,
    created_at: "2026-08-11T14:00:00.000Z",
  },
  {
    _id: "t2",
    title: "Invoice PDF blank",
    priority: "medium",
    status: "open",
    claimed_by_id: null,
    claimed_by_name: null,
    created_at: "2026-08-11T13:00:00.000Z",
  },
  {
    _id: "t3",
    title: "SSO timeout",
    priority: "high",
    status: "claimed",
    claimed_by_id: "m2",
    claimed_by_name: "Ben Agent",
    created_at: "2026-08-11T12:00:00.000Z",
  },
];

let summaryState: TicketSummary = { open: 2, claimed: 1 };
let ticketState: TicketRecord[] = structuredClone(tickets);

function installTicketFetch() {
  installFetchMock((url, init) => {
    const path = url.pathname;
    const method = (init?.method ?? "GET").toUpperCase();

    if (path.endsWith("/api/tickets/summary") && method === "GET") {
      return jsonResponse(summaryState);
    }

    if (path.endsWith("/api/tickets") && method === "GET") {
      const status = url.searchParams.get("status") ?? "all";
      const list =
        status === "all"
          ? ticketState
          : ticketState.filter((ticket) => ticket.status === status);
      return jsonResponse(list);
    }

    const claimMatch = path.match(/\/api\/tickets\/([^/]+)\/claim$/);
    if (claimMatch && method === "POST") {
      const id = claimMatch[1];
      const body = JSON.parse(String(init?.body ?? "{}")) as { member_id?: string };
      const current = ticketState.find((ticket) => ticket._id === id);
      if (!current) {
        return jsonResponse({ message: "Ticket not found." }, 404);
      }
      if (current.status !== "open") {
        return jsonResponse(
          { message: "Ticket is no longer open.", latest: current },
          409,
        );
      }
      const updated: TicketRecord = {
        ...current,
        status: "claimed",
        claimed_by_id: body.member_id ?? "m1",
        claimed_by_name: "Ava Agent",
      };
      ticketState = ticketState.map((ticket) =>
        ticket._id === id ? updated : ticket,
      );
      summaryState = {
        open: ticketState.filter((t) => t.status === "open").length,
        claimed: ticketState.filter((t) => t.status === "claimed").length,
      };
      return jsonResponse(updated);
    }

    return jsonResponse({ message: `Unhandled mock route: ${method} ${path}` }, 500);
  });
}

describe("ticket claim UI", () => {
  beforeEach(() => {
    ticketState = structuredClone(tickets);
    summaryState = { open: 2, claimed: 1 };
  });

  test("[UI] The ticket list and summary load on first render", async () => {
    installTicketFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    expect(await screen.findByTestId("ticket-list")).toBeInTheDocument();
    expect(screen.getByTestId("t1-ticket-title")).toHaveTextContent(
      "Password reset loop",
    );
    expect(screen.getByTestId("summary-open")).toHaveTextContent("2");
    expect(screen.getByTestId("summary-claimed")).toHaveTextContent("1");
  });

  test("[UI] Claiming a ticket updates the row and summary", async () => {
    installTicketFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("ticket-list");

    const row = screen.getByTestId("t1-ticket-row");
    await userEvent.click(within(row).getByRole("button", { name: /claim ticket/i }));

    await waitFor(() => {
      expect(screen.getByTestId("t1-ticket-status")).toHaveTextContent("claimed");
      expect(screen.getByTestId("t1-ticket-claimed-by")).toHaveTextContent(
        "Ava Agent",
      );
      expect(screen.getByTestId("summary-open")).toHaveTextContent("1");
      expect(screen.getByTestId("summary-claimed")).toHaveTextContent("2");
    });
  });

  test("[UI] A lost claim shows the conflict message and refetches the list", async () => {
    installFetchMock((url, init) => {
      const path = url.pathname;
      const method = (init?.method ?? "GET").toUpperCase();

      if (path.endsWith("/api/tickets/summary") && method === "GET") {
        return jsonResponse(summaryState);
      }

      if (path.endsWith("/api/tickets") && method === "GET") {
        const status = url.searchParams.get("status") ?? "all";
        const list =
          status === "all"
            ? ticketState
            : ticketState.filter((ticket) => ticket.status === status);
        return jsonResponse(list);
      }

      const claimMatch = path.match(/\/api\/tickets\/([^/]+)\/claim$/);
      if (claimMatch && method === "POST") {
        const id = claimMatch[1];
        const current = ticketState.find((ticket) => ticket._id === id);
        if (!current) {
          return jsonResponse({ message: "Ticket not found." }, 404);
        }
        // Race: peer claimed first — storage already updated; client must refetch GET.
        const latest: TicketRecord = {
          ...current,
          status: "claimed",
          claimed_by_id: "m2",
          claimed_by_name: "Ben Agent",
        };
        ticketState = ticketState.map((ticket) =>
          ticket._id === id ? latest : ticket,
        );
        summaryState = {
          open: ticketState.filter((t) => t.status === "open").length,
          claimed: ticketState.filter((t) => t.status === "claimed").length,
        };
        return jsonResponse(
          { message: "Ticket is no longer open.", latest },
          409,
        );
      }

      return jsonResponse({ message: `Unhandled mock route: ${method} ${path}` }, 500);
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("ticket-list");

    const row = screen.getByTestId("t1-ticket-row");
    await userEvent.click(within(row).getByRole("button", { name: /claim ticket/i }));

    expect(await screen.findByTestId("conflict-message")).toHaveTextContent(
      /no longer open/i,
    );
    await waitFor(() => {
      expect(screen.getByTestId("t1-ticket-status")).toHaveTextContent("claimed");
      expect(screen.getByTestId("t1-ticket-claimed-by")).toHaveTextContent(
        "Ben Agent",
      );
    });
  });

  test("[UI] List rows expose title and status tiles", async () => {
    installTicketFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("ticket-list");

    expect(screen.getByTestId("t1-ticket-title")).toHaveTextContent(
      "Password reset loop",
    );
    expect(screen.getByTestId("t1-ticket-status")).toHaveTextContent("open");
    expect(screen.getByTestId("t3-ticket-status")).toHaveTextContent("claimed");
    expect(screen.getByTestId("t3-ticket-claimed-by")).toHaveTextContent(
      "Ben Agent",
    );
    expect(screen.queryByTestId("t1-ticket-claimed-by")).not.toBeInTheDocument();
  });
});
