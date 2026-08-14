/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadChallengeApp } from "../../client/src/load-challenge-app.tsx";
import type {
  CatalogProduct,
  DraftOrderRecord,
  DraftOrderSummary,
} from "../../shared/types.ts";
import { installFetchMock, jsonResponse } from "./mock-fetch.ts";

const products: CatalogProduct[] = [
  { _id: "p1", name: "Widget", unit_price_cents: 1000 },
  { _id: "p2", name: "Gadget", unit_price_cents: 2500 },
  { _id: "p3", name: "Cable", unit_price_cents: 500 },
];

const orders: DraftOrderRecord[] = [
  {
    _id: "o1",
    customer_name: "Northwind",
    status: "draft",
    owner_id: "m1",
    owner_name: "Ava Owner",
    total_cents: 4500,
    notes: "Rush if possible",
    version: 1,
    updated_at: "2026-08-13T10:00:00.000Z",
    lines: [
      {
        _id: "ol1",
        order_id: "o1",
        product_id: "p1",
        product_name: "Widget",
        quantity: 2,
        unit_price_cents: 1000,
        line_total_cents: 2000,
      },
      {
        _id: "ol2",
        order_id: "o1",
        product_id: "p2",
        product_name: "Gadget",
        quantity: 1,
        unit_price_cents: 2500,
        line_total_cents: 2500,
      },
    ],
  },
  {
    _id: "o2",
    customer_name: "Acme",
    status: "submitted",
    owner_id: "m1",
    owner_name: "Ava Owner",
    total_cents: 1000,
    notes: "",
    version: 2,
    updated_at: "2026-08-12T10:00:00.000Z",
    lines: [
      {
        _id: "ol3",
        order_id: "o2",
        product_id: "p1",
        product_name: "Widget",
        quantity: 1,
        unit_price_cents: 1000,
        line_total_cents: 1000,
      },
    ],
  },
];

let orderState: DraftOrderRecord[] = structuredClone(orders);
let summaryState: DraftOrderSummary = {
  draft: 1,
  submitted: 1,
  cancelled: 0,
};

function recomputeSummary() {
  summaryState = {
    draft: orderState.filter((order) => order.status === "draft").length,
    submitted: orderState.filter((order) => order.status === "submitted")
      .length,
    cancelled: orderState.filter((order) => order.status === "cancelled")
      .length,
  };
}

function replaceOrder(updated: DraftOrderRecord) {
  orderState = orderState.map((order) =>
    order._id === updated._id ? updated : order,
  );
  recomputeSummary();
}

function installOrderFetch(
  handlers: {
    addLine?: (
      id: string,
      init?: RequestInit,
    ) => Response | Promise<Response>;
    submit?: (
      id: string,
      init?: RequestInit,
    ) => Response | Promise<Response>;
  } = {},
) {
  installFetchMock((url, init) => {
    const path = url.pathname;
    const method = (init?.method ?? "GET").toUpperCase();

    if (path.endsWith("/api/products") && method === "GET") {
      return jsonResponse(products);
    }

    if (path.endsWith("/api/orders/summary") && method === "GET") {
      return jsonResponse(summaryState);
    }

    if (path.endsWith("/api/orders") && method === "GET") {
      const status = url.searchParams.get("status") ?? "all";
      const list =
        status === "all"
          ? orderState
          : orderState.filter((order) => order.status === status);
      return jsonResponse(list);
    }

    const addMatch = path.match(/\/api\/orders\/([^/]+)\/lines$/);
    if (addMatch && method === "POST") {
      const id = addMatch[1]!;
      if (handlers.addLine) {
        return handlers.addLine(id, init);
      }
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        expected_version?: number;
        product_id?: string;
        quantity?: number;
        owner_id?: string;
      };
      const current = orderState.find((order) => order._id === id);
      if (!current) {
        return jsonResponse({ message: "Order not found." }, 404);
      }
      if (current.lines.some((line) => line.product_id === body.product_id)) {
        return jsonResponse(
          { message: "Product already on order.", latest: current },
          409,
        );
      }
      const product = products.find((row) => row._id === body.product_id);
      if (!product) {
        return jsonResponse({ message: "Unknown product." }, 400);
      }
      const quantity = Number(body.quantity ?? 1);
      const line = {
        _id: `ol-new`,
        order_id: id,
        product_id: product._id,
        product_name: product.name,
        quantity,
        unit_price_cents: product.unit_price_cents,
        line_total_cents: quantity * product.unit_price_cents,
      };
      const updated: DraftOrderRecord = {
        ...current,
        version: current.version + 1,
        total_cents: current.total_cents + line.line_total_cents,
        lines: [...current.lines, line],
      };
      replaceOrder(updated);
      return jsonResponse(updated);
    }

    const submitMatch = path.match(/\/api\/orders\/([^/]+)\/submit$/);
    if (submitMatch && method === "POST") {
      const id = submitMatch[1]!;
      if (handlers.submit) {
        return handlers.submit(id, init);
      }
      const current = orderState.find((order) => order._id === id);
      if (!current) {
        return jsonResponse({ message: "Order not found." }, 404);
      }
      const updated: DraftOrderRecord = {
        ...current,
        status: "submitted",
        version: current.version + 1,
      };
      replaceOrder(updated);
      return jsonResponse(updated);
    }

    return jsonResponse(
      { message: `Unhandled mock route: ${method} ${path}` },
      500,
    );
  });
}

describe("order lines UI", () => {
  beforeEach(() => {
    orderState = structuredClone(orders);
    recomputeSummary();
  });

  test("[UI] The order list, summary, and status filter load on first render", async () => {
    installOrderFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    expect(await screen.findByTestId("order-list")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /status filter/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("o1-order-customer")).toHaveTextContent(
      "Northwind",
    );
    expect(screen.getByTestId("o1-order-status")).toHaveTextContent("draft");
    expect(screen.getByTestId("o1-order-total")).toHaveTextContent("4500");
    expect(screen.getByTestId("summary-draft")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-submitted")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-cancelled")).toHaveTextContent("0");
  });

  test("[UI] Status filter updates the list", async () => {
    let lastStatus: string | null = null;
    installFetchMock((url, init) => {
      const path = url.pathname;
      const method = (init?.method ?? "GET").toUpperCase();
      if (path.endsWith("/api/products") && method === "GET") {
        return jsonResponse(products);
      }
      if (path.endsWith("/api/orders/summary") && method === "GET") {
        return jsonResponse(summaryState);
      }
      if (path.endsWith("/api/orders") && method === "GET") {
        lastStatus = url.searchParams.get("status");
        const status = lastStatus ?? "all";
        const list =
          status === "all"
            ? orderState
            : orderState.filter((order) => order.status === status);
        return jsonResponse(list);
      }
      return jsonResponse({ message: "unhandled" }, 500);
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("order-list");

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /status filter/i }),
      "submitted",
    );

    await waitFor(() => {
      expect(lastStatus).toBe("submitted");
      expect(screen.queryByTestId("o1-order-row")).not.toBeInTheDocument();
      expect(screen.getByTestId("o2-order-row")).toBeInTheDocument();
    });
  });

  test("[UI] Expanding a draft, adding a line, and saving reflects the draft", async () => {
    let lastAddBody: unknown = null;
    installOrderFetch({
      addLine: (id, init) => {
        lastAddBody = JSON.parse(String(init?.body ?? "{}"));
        const body = lastAddBody as {
          expected_version?: number;
          product_id?: string;
          quantity?: number;
          owner_id?: string;
        };
        const current = orderState.find((order) => order._id === id)!;
        const product = products.find((row) => row._id === body.product_id)!;
        const quantity = Number(body.quantity ?? 1);
        const line = {
          _id: "ol-new",
          order_id: id,
          product_id: product._id,
          product_name: product.name,
          quantity,
          unit_price_cents: product.unit_price_cents,
          line_total_cents: quantity * product.unit_price_cents,
        };
        const updated: DraftOrderRecord = {
          ...current,
          version: (body.expected_version ?? current.version) + 1,
          total_cents: current.total_cents + line.line_total_cents,
          lines: [...current.lines, line],
        };
        replaceOrder(updated);
        return jsonResponse(updated);
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("order-list");

    const row = screen.getByTestId("o1-order-row");
    await userEvent.click(within(row).getByRole("button", { name: /expand/i }));
    expect(screen.getByTestId("o1-details-view")).toBeInTheDocument();
    expect(screen.queryByTestId("o1-details-form")).not.toBeInTheDocument();

    await userEvent.click(within(row).getByRole("button", { name: /^edit$/i }));
    const form = screen.getByTestId("o1-details-form");

    await userEvent.selectOptions(
      within(form).getByRole("combobox", { name: /o1-add-product/i }),
      "p3",
    );
    const qty = within(form).getByRole("textbox", {
      name: /o1-add-quantity/i,
    });
    await userEvent.clear(qty);
    await userEvent.type(qty, "3");
    await userEvent.click(
      within(form).getByRole("button", { name: /add line/i }),
    );

    await waitFor(() => {
      expect(lastAddBody).toMatchObject({
        owner_id: "m1",
        expected_version: 1,
        product_id: "p3",
        quantity: 3,
      });
      expect(screen.getByTestId("o1-order-total")).toHaveTextContent("6000");
      expect(screen.getByTestId("o1-version")).toHaveTextContent("2");
    });
  });

  test("[UI] A duplicate line shows conflict-message", async () => {
    installOrderFetch({
      addLine: (id) => {
        const current = orderState.find((order) => order._id === id)!;
        return jsonResponse(
          { message: "Product already on order.", latest: current },
          409,
        );
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("order-list");

    const row = screen.getByTestId("o1-order-row");
    await userEvent.click(within(row).getByRole("button", { name: /^edit$/i }));
    await userEvent.click(
      within(screen.getByTestId("o1-details-form")).getByRole("button", {
        name: /add line/i,
      }),
    );

    expect(await screen.findByTestId("conflict-message")).toHaveTextContent(
      /already on order|duplicate|conflict/i,
    );
  });

  test("[UI] A stale save shows stale-message", async () => {
    installOrderFetch({
      addLine: (id) => {
        const current = orderState.find((order) => order._id === id)!;
        return jsonResponse(
          { message: "Stale version.", latest: current },
          412,
        );
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("order-list");

    const row = screen.getByTestId("o1-order-row");
    await userEvent.click(within(row).getByRole("button", { name: /^edit$/i }));
    await userEvent.selectOptions(
      within(screen.getByTestId("o1-details-form")).getByRole("combobox", {
        name: /o1-add-product/i,
      }),
      "p3",
    );
    await userEvent.click(
      within(screen.getByTestId("o1-details-form")).getByRole("button", {
        name: /add line/i,
      }),
    );

    expect(await screen.findByTestId("stale-message")).toHaveTextContent(
      /stale/i,
    );
  });

  test("[UI] A locked (submitted) save shows locked-message", async () => {
    installOrderFetch({
      addLine: (id) => {
        const current = orderState.find((order) => order._id === id)!;
        return jsonResponse(
          { message: "Order is not editable.", latest: current },
          422,
        );
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("order-list");

    const row = screen.getByTestId("o1-order-row");
    await userEvent.click(within(row).getByRole("button", { name: /^edit$/i }));
    await userEvent.selectOptions(
      within(screen.getByTestId("o1-details-form")).getByRole("combobox", {
        name: /o1-add-product/i,
      }),
      "p3",
    );
    await userEvent.click(
      within(screen.getByTestId("o1-details-form")).getByRole("button", {
        name: /add line/i,
      }),
    );

    expect(await screen.findByTestId("locked-message")).toHaveTextContent(
      /not editable|locked|submitted/i,
    );
  });

  test("[UI] Submitting an order updates the row and summary", async () => {
    installOrderFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("order-list");

    const row = screen.getByTestId("o1-order-row");
    await userEvent.click(within(row).getByRole("button", { name: /^edit$/i }));
    await userEvent.click(
      within(screen.getByTestId("o1-details-form")).getByRole("button", {
        name: /submit order/i,
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("o1-order-status")).toHaveTextContent(
        "submitted",
      );
      expect(screen.getByTestId("summary-draft")).toHaveTextContent("0");
      expect(screen.getByTestId("summary-submitted")).toHaveTextContent("2");
    });
  });
});
