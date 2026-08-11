/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadChallengeApp } from "../../client/src/load-challenge-app.tsx";
import type { OrderRecord, OrderSummary } from "../../shared/types.ts";
import { installFetchMock, jsonResponse } from "./mock-fetch.ts";

const orders: OrderRecord[] = [
  {
    _id: "ord1",
    customer_name: "Ava Ng",
    status: "open",
    total_cents: 4599,
    created_at: "2026-08-10T14:00:00.000Z",
    notes: "Gift wrap",
  },
  {
    _id: "ord2",
    customer_name: "Ben Ortiz",
    status: "paid",
    total_cents: 12900,
    created_at: "2026-08-10T13:00:00.000Z",
    notes: "Express shipping",
  },
  {
    _id: "ord3",
    customer_name: "Cara Quinn",
    status: "shipped",
    total_cents: 7800,
    created_at: "2026-08-10T12:00:00.000Z",
    notes: "Left at door",
  },
];

const summary: OrderSummary = {
  open: 1,
  paid: 1,
  shipped: 1,
  cancelled: 0,
  total_cents: 4599 + 12900 + 7800,
};

function installOrdersFetch(handlers: {
  list?: (url: URL) => Response | Promise<Response>;
  summary?: () => Response | Promise<Response>;
} = {}) {
  installFetchMock((url, init) => {
    const path = url.pathname;
    const method = (init?.method ?? "GET").toUpperCase();

    if (path.endsWith("/api/orders/summary") && method === "GET") {
      return handlers.summary?.() ?? jsonResponse(summary);
    }

    if (path.endsWith("/api/orders") && method === "GET") {
      return (
        handlers.list?.(url) ??
        (() => {
          const status = url.searchParams.get("status") ?? "all";
          const list =
            status === "all" || !status
              ? orders
              : orders.filter((order) => order.status === status);
          return jsonResponse(list);
        })()
      );
    }

    return jsonResponse({ message: `Unhandled mock route: ${method} ${path}` }, 500);
  });
}

describe("orders inbox UI", () => {
  test("[UI] The order list and summary load on first render", async () => {
    installOrdersFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    expect(await screen.findByTestId("order-list")).toBeInTheDocument();
    expect(screen.getByTestId("ord1-order-customer")).toHaveTextContent("Ava Ng");
    expect(screen.getByTestId("summary-open")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-paid")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-total-cents")).toHaveTextContent("25299");
  });

  test("[UI] Status filter updates the list", async () => {
    let lastStatus: string | null = null;
    installOrdersFetch({
      list: (url) => {
        lastStatus = url.searchParams.get("status");
        const status = lastStatus ?? "all";
        const list =
          status === "all"
            ? orders
            : orders.filter((order) => order.status === status);
        return jsonResponse(list);
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("order-list");

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /status filter/i }),
      "paid",
    );

    await waitFor(() => {
      expect(lastStatus).toBe("paid");
    });
    expect(screen.getByTestId("ord2-order-row")).toBeInTheDocument();
    expect(screen.queryByTestId("ord1-order-row")).not.toBeInTheDocument();
    // Summary stays global
    expect(screen.getByTestId("summary-open")).toHaveTextContent("1");
  });

  test("[UI] Expanding an order shows read-only details without a form", async () => {
    installOrdersFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("order-list");

    const row = screen.getByTestId("ord1-order-row");
    expect(screen.queryByTestId("ord1-details-view")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ord1-details-form")).not.toBeInTheDocument();

    await userEvent.click(within(row).getByRole("button", { name: /expand/i }));

    expect(screen.getByTestId("ord1-details-view")).toBeInTheDocument();
    expect(screen.getByTestId("ord1-details-view")).toHaveTextContent("Gift wrap");
    expect(screen.queryByTestId("ord1-details-form")).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
  });

  test("[UI] List rows expose customer, status, and total tiles", async () => {
    installOrdersFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("order-list");

    expect(screen.getByTestId("ord1-order-customer")).toHaveTextContent("Ava Ng");
    expect(screen.getByTestId("ord1-order-status")).toHaveTextContent("open");
    expect(screen.getByTestId("ord1-order-total")).toHaveTextContent("4599");
  });
});
