/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadChallengeApp } from "../../client/src/load-challenge-app.tsx";
import type { ProductFilter, ProductRecord } from "../../shared/types.ts";
import { installFetchMock, jsonResponse } from "./mock-fetch.ts";

const allProducts: ProductRecord[] = [
  { _id: "prod1", name: "Air Runner", brand: "Nike", discount_percent: 15, stock: 12 },
  { _id: "prod2", name: "Classic Tee", brand: "Nike", discount_percent: 5, stock: 0 },
  { _id: "prod3", name: "Garden Hose", brand: "Gucci", discount_percent: 20, stock: 3 },
  { _id: "prod6", name: "Court Sneaker", brand: "Adidas", discount_percent: 10, stock: 20 },
];

function applyFilters(products: ProductRecord[], filters: ProductFilter[]) {
  return products
    .filter((product) =>
      filters.every((filter) => {
        if (filter.key === "brand") {
          return product.brand.toLowerCase().includes(String(filter.value).toLowerCase());
        }
        if (filter.key === "discount") {
          if (filter.operator === "greater_than") {
            return product.discount_percent > filter.value;
          }
          if (filter.operator === "less_than") {
            return product.discount_percent < filter.value;
          }
          return product.discount_percent === filter.value;
        }
        if (filter.key === "stock") {
          return filter.operator === "in_stock"
            ? product.stock > 0
            : product.stock <= 0;
        }
        return true;
      }),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

function installProductFetch(
  handler?: (filters: ProductFilter[]) => Response | Promise<Response>,
) {
  installFetchMock((url, init) => {
    const path = url.pathname;
    const method = (init?.method ?? "GET").toUpperCase();

    if (path.endsWith("/api/products/query") && method === "POST") {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        filters?: ProductFilter[];
      };
      const filters = body.filters ?? [];
      return (
        handler?.(filters) ?? jsonResponse(applyFilters(allProducts, filters))
      );
    }

    return jsonResponse({ message: `Unhandled mock route: ${method} ${path}` }, 500);
  });
}

describe("product filter UI", () => {
  test("[UI] The product list loads on first render", async () => {
    installProductFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    expect(await screen.findByTestId("product-list")).toBeInTheDocument();
    expect(screen.getByTestId("prod1-product-name")).toHaveTextContent("Air Runner");
  });

  test("[UI] Brand filter updates the list", async () => {
    let lastFilters: ProductFilter[] = [];
    installProductFetch((filters) => {
      lastFilters = filters;
      return jsonResponse(applyFilters(allProducts, filters));
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("product-list");

    await userEvent.type(screen.getByRole("textbox", { name: /brand filter/i }), "gucc");
    await userEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(lastFilters).toEqual([
        { key: "brand", operator: "contains", value: "gucc" },
      ]);
    });
    expect(screen.getByTestId("prod3-product-row")).toBeInTheDocument();
    expect(screen.queryByTestId("prod1-product-row")).not.toBeInTheDocument();
  });

  test("[UI] Discount filter updates the list", async () => {
    let lastFilters: ProductFilter[] = [];
    installProductFetch((filters) => {
      lastFilters = filters;
      return jsonResponse(applyFilters(allProducts, filters));
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("product-list");

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /discount operator/i }),
      "greater_than",
    );
    await userEvent.clear(screen.getByLabelText(/discount value/i));
    await userEvent.type(screen.getByLabelText(/discount value/i), "15");
    await userEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(lastFilters).toEqual([
        { key: "discount", operator: "greater_than", value: 15 },
      ]);
    });
    expect(screen.getByTestId("prod3-product-row")).toBeInTheDocument();
    expect(screen.queryByTestId("prod1-product-row")).not.toBeInTheDocument();
  });

  test("[UI] Stock filter updates the list", async () => {
    let lastFilters: ProductFilter[] = [];
    installProductFetch((filters) => {
      lastFilters = filters;
      return jsonResponse(applyFilters(allProducts, filters));
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("product-list");

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /stock filter/i }),
      "in_stock",
    );
    await userEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(lastFilters).toEqual([{ key: "stock", operator: "in_stock" }]);
    });

    const list = screen.getByTestId("product-list");
    expect(within(list).queryByTestId("prod2-product-row")).not.toBeInTheDocument();
    expect(within(list).getByTestId("prod1-product-row")).toBeInTheDocument();
  });
});
