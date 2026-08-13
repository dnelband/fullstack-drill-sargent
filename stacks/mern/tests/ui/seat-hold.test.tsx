/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadChallengeApp } from "../../client/src/load-challenge-app.tsx";
import type { SeatRecord, SeatSummary } from "../../shared/types.ts";
import { installFetchMock, jsonResponse } from "./mock-fetch.ts";

const seats: SeatRecord[] = [
  {
    _id: "s1",
    section: "Orchestra",
    label: "A1",
    status: "open",
    held_by_id: null,
    held_by_name: null,
    held_until: null,
    notes: "",
    version: 1,
  },
  {
    _id: "s3",
    section: "Orchestra",
    label: "B1",
    status: "held",
    held_by_id: "m2",
    held_by_name: "Ben Buyer",
    held_until: "2099-01-01T00:00:00.000Z",
    notes: "Paid deposit",
    version: 2,
  },
  {
    _id: "s5",
    section: "Balcony",
    label: "C2",
    status: "held",
    held_by_id: "m1",
    held_by_name: "Ava Buyer",
    held_until: "2099-01-01T00:00:00.000Z",
    notes: "Aisle preference",
    version: 3,
  },
];

let seatState: SeatRecord[] = structuredClone(seats);
let summaryState: SeatSummary = { open: 1, held: 2 };

function recomputeSummary() {
  summaryState = {
    open: seatState.filter((seat) => seat.status === "open").length,
    held: seatState.filter((seat) => seat.status === "held").length,
  };
}

function installSeatFetch(
  handlers: {
    hold?: (id: string, init?: RequestInit) => Response | Promise<Response>;
    patch?: (id: string, init?: RequestInit) => Response | Promise<Response>;
  } = {},
) {
  installFetchMock((url, init) => {
    const path = url.pathname;
    const method = (init?.method ?? "GET").toUpperCase();

    if (path.endsWith("/api/seats/summary") && method === "GET") {
      return jsonResponse(summaryState);
    }

    if (path.endsWith("/api/seats") && method === "GET") {
      const status = url.searchParams.get("status") ?? "all";
      const list =
        status === "all"
          ? seatState
          : seatState.filter((seat) => seat.status === status);
      return jsonResponse(list);
    }

    const holdMatch = path.match(/\/api\/seats\/([^/]+)\/hold$/);
    if (holdMatch && method === "POST") {
      const id = holdMatch[1]!;
      if (handlers.hold) {
        return handlers.hold(id, init);
      }
      const current = seatState.find((seat) => seat._id === id);
      if (!current) {
        return jsonResponse({ message: "Seat not found." }, 404);
      }
      if (current.status === "held") {
        return jsonResponse(
          { message: "Seat is actively held.", latest: current },
          409,
        );
      }
      const updated: SeatRecord = {
        ...current,
        status: "held",
        held_by_id: "m1",
        held_by_name: "Ava Buyer",
        held_until: "2099-01-01T00:00:00.000Z",
        version: current.version + 1,
      };
      seatState = seatState.map((seat) => (seat._id === id ? updated : seat));
      recomputeSummary();
      return jsonResponse(updated);
    }

    const patchMatch = path.match(/\/api\/seats\/([^/]+)$/);
    if (patchMatch && method === "PATCH") {
      const id = patchMatch[1]!;
      if (handlers.patch) {
        return handlers.patch(id, init);
      }
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        expected_version?: number;
        notes?: string;
      };
      const current = seatState.find((seat) => seat._id === id);
      if (!current) {
        return jsonResponse({ message: "Seat not found." }, 404);
      }
      if (current.version !== body.expected_version) {
        return jsonResponse({ message: "Stale version.", latest: current }, 412);
      }
      const updated: SeatRecord = {
        ...current,
        notes: String(body.notes ?? ""),
        version: current.version + 1,
      };
      seatState = seatState.map((seat) => (seat._id === id ? updated : seat));
      return jsonResponse(updated);
    }

    return jsonResponse({ message: `Unhandled mock route: ${method} ${path}` }, 500);
  });
}

describe("seat hold UI", () => {
  beforeEach(() => {
    seatState = structuredClone(seats);
    recomputeSummary();
  });

  test("[UI] The seat list, summary, and status filter load on first render", async () => {
    installSeatFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    expect(await screen.findByTestId("seat-list")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /status filter/i })).toBeInTheDocument();
    expect(screen.getByTestId("s1-seat-label")).toHaveTextContent("A1");
    expect(screen.getByTestId("s1-seat-section")).toHaveTextContent("Orchestra");
    expect(screen.getByTestId("s1-seat-status")).toHaveTextContent("open");
    expect(screen.getByTestId("s5-seat-holder")).toHaveTextContent("Ava Buyer");
    expect(screen.getByTestId("summary-open")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-held")).toHaveTextContent("2");
  });

  test("[UI] Status filter updates the list", async () => {
    let lastStatus: string | null = null;
    installFetchMock((url, init) => {
      const path = url.pathname;
      const method = (init?.method ?? "GET").toUpperCase();
      if (path.endsWith("/api/seats/summary") && method === "GET") {
        return jsonResponse(summaryState);
      }
      if (path.endsWith("/api/seats") && method === "GET") {
        lastStatus = url.searchParams.get("status");
        const status = lastStatus ?? "all";
        const list =
          status === "all"
            ? seatState
            : seatState.filter((seat) => seat.status === status);
        return jsonResponse(list);
      }
      return jsonResponse({ message: "unhandled" }, 500);
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("seat-list");

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /status filter/i }),
      "held",
    );

    await waitFor(() => {
      expect(lastStatus).toBe("held");
      expect(screen.queryByTestId("s1-seat-row")).not.toBeInTheDocument();
      expect(screen.getByTestId("s5-seat-row")).toBeInTheDocument();
    });
  });

  test("[UI] Holding a seat updates the row and summary", async () => {
    installSeatFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("seat-list");

    const row = screen.getByTestId("s1-seat-row");
    await userEvent.click(within(row).getByRole("button", { name: /hold seat/i }));

    await waitFor(() => {
      expect(screen.getByTestId("s1-seat-status")).toHaveTextContent("held");
      expect(screen.getByTestId("s1-seat-holder")).toHaveTextContent("Ava Buyer");
      expect(screen.getByTestId("summary-open")).toHaveTextContent("0");
      expect(screen.getByTestId("summary-held")).toHaveTextContent("3");
    });
  });

  test("[UI] A lost hold shows conflict-message and refetches the list", async () => {
    installSeatFetch({
      hold: (id) => {
        const current = seatState.find((seat) => seat._id === id)!;
        const latest: SeatRecord = {
          ...current,
          status: "held",
          held_by_id: "m2",
          held_by_name: "Ben Buyer",
          held_until: "2099-01-01T00:00:00.000Z",
          version: current.version + 1,
        };
        seatState = seatState.map((seat) => (seat._id === id ? latest : seat));
        recomputeSummary();
        return jsonResponse(
          { message: "Seat is actively held.", latest },
          409,
        );
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("seat-list");

    await userEvent.click(
      within(screen.getByTestId("s1-seat-row")).getByRole("button", {
        name: /hold seat/i,
      }),
    );

    expect(await screen.findByTestId("conflict-message")).toHaveTextContent(
      /actively held|already held|no longer available/i,
    );
    await waitFor(() => {
      expect(screen.getByTestId("s1-seat-status")).toHaveTextContent("held");
      expect(screen.getByTestId("s1-seat-holder")).toHaveTextContent("Ben Buyer");
    });
  });

  test("[UI] Expanding a held seat, editing notes, and saving reflects the draft", async () => {
    let lastPatchBody: unknown = null;
    installSeatFetch({
      patch: (id, init) => {
        lastPatchBody = JSON.parse(String(init?.body ?? "{}"));
        const body = lastPatchBody as {
          expected_version?: number;
          notes?: string;
          member_id?: string;
        };
        const current = seatState.find((seat) => seat._id === id)!;
        const updated: SeatRecord = {
          ...current,
          notes: String(body.notes ?? ""),
          version: (body.expected_version ?? current.version) + 1,
        };
        seatState = seatState.map((seat) => (seat._id === id ? updated : seat));
        return jsonResponse(updated);
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("seat-list");

    const row = screen.getByTestId("s5-seat-row");
    await userEvent.click(within(row).getByRole("button", { name: /expand/i }));
    expect(screen.getByTestId("s5-details-view")).toBeInTheDocument();
    expect(screen.queryByTestId("s5-details-form")).not.toBeInTheDocument();

    await userEvent.click(within(row).getByRole("button", { name: /^edit$/i }));
    const form = screen.getByTestId("s5-details-form");
    const notes = within(form).getByRole("textbox", { name: /s5-notes|notes/i });
    await userEvent.clear(notes);
    await userEvent.type(notes, "Window side");
    await userEvent.click(
      within(form).getByRole("button", { name: /save detail changes/i }),
    );

    await waitFor(() => {
      expect(lastPatchBody).toMatchObject({
        member_id: "m1",
        expected_version: 3,
        notes: "Window side",
      });
      expect(screen.getByTestId("s5-version")).toHaveTextContent("4");
      expect(screen.getByTestId("s5-details-view")).toHaveTextContent("Window side");
    });
  });

  test("[UI] A stale save shows stale-message", async () => {
    installSeatFetch({
      patch: (_id, _init) => {
        const current = seatState.find((seat) => seat._id === "s5")!;
        return jsonResponse(
          { message: "Your copy is stale.", latest: current },
          412,
        );
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("seat-list");

    const row = screen.getByTestId("s5-seat-row");
    await userEvent.click(within(row).getByRole("button", { name: /expand/i }));
    await userEvent.click(within(row).getByRole("button", { name: /^edit$/i }));
    await userEvent.click(
      within(screen.getByTestId("s5-details-form")).getByRole("button", {
        name: /save detail changes/i,
      }),
    );

    expect(await screen.findByTestId("stale-message")).toHaveTextContent(/stale/i);
  });

  test("[UI] An expired-hold save shows gone-message", async () => {
    installSeatFetch({
      patch: (_id, _init) => {
        const current = seatState.find((seat) => seat._id === "s5")!;
        return jsonResponse(
          { message: "Hold has expired.", latest: current },
          410,
        );
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("seat-list");

    const row = screen.getByTestId("s5-seat-row");
    await userEvent.click(within(row).getByRole("button", { name: /expand/i }));
    await userEvent.click(within(row).getByRole("button", { name: /^edit$/i }));
    await userEvent.click(
      within(screen.getByTestId("s5-details-form")).getByRole("button", {
        name: /save detail changes/i,
      }),
    );

    expect(await screen.findByTestId("gone-message")).toHaveTextContent(/expired/i);
  });
});
