/** @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadChallengeApp } from "../../client/src/load-challenge-app.tsx";
import type {
  CouponRecord,
  CouponSummary,
  RedemptionRecord,
} from "../../shared/types.ts";
import { installFetchMock, jsonResponse } from "./mock-fetch.ts";

const coupons: CouponRecord[] = [
  {
    _id: "c1",
    code: "WELCOME10",
    title: "Welcome ten percent",
    discount_percent: 10,
    remaining: 5,
    max_per_user: 2,
    expires_at: "2027-01-01T00:00:00.000Z",
    status: "active",
  },
  {
    _id: "c2",
    code: "FLASH50",
    title: "Flash fifty",
    discount_percent: 50,
    remaining: 1,
    max_per_user: 1,
    expires_at: "2027-06-01T00:00:00.000Z",
    status: "active",
  },
  {
    _id: "c4",
    code: "GONE15",
    title: "Exhausted fifteen",
    discount_percent: 15,
    remaining: 0,
    max_per_user: 1,
    expires_at: "2027-01-01T00:00:00.000Z",
    status: "exhausted",
  },
];

let couponState: CouponRecord[] = structuredClone(coupons);
let redemptionState: RedemptionRecord[] = [];
let summaryState: CouponSummary = {
  active: 2,
  expired: 0,
  exhausted: 1,
  redemptions: 0,
};
const seenIdempotency = new Map<string, { body: string; redemption: RedemptionRecord }>();

function recomputeSummary() {
  summaryState = {
    active: couponState.filter((c) => c.status === "active").length,
    expired: couponState.filter((c) => c.status === "expired").length,
    exhausted: couponState.filter((c) => c.status === "exhausted").length,
    redemptions: redemptionState.length,
  };
}

function installCouponFetch() {
  installFetchMock((url, init) => {
    const path = url.pathname;
    const method = (init?.method ?? "GET").toUpperCase();

    if (path.endsWith("/api/coupons/summary") && method === "GET") {
      return jsonResponse(summaryState);
    }

    if (path.endsWith("/api/redemptions") && method === "GET") {
      return jsonResponse(redemptionState);
    }

    if (path.endsWith("/api/coupons") && method === "GET") {
      const status = url.searchParams.get("status") ?? "all";
      const list =
        status === "all"
          ? couponState
          : couponState.filter((coupon) => coupon.status === status);
      return jsonResponse(list);
    }

    if (path.endsWith("/api/coupons/redeem") && method === "POST") {
      const headers = init?.headers as Record<string, string> | undefined;
      const key =
        headers?.["Idempotency-Key"] ??
        headers?.["idempotency-key"] ??
        (headers &&
          Object.entries(headers).find(([name]) => name.toLowerCase() === "idempotency-key")?.[1]);
      if (!key) {
        return jsonResponse({ message: "Idempotency-Key is required." }, 400);
      }
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        code?: string;
        user_id?: string;
      };
      const code = String(body.code ?? "").toUpperCase();
      const bodyKey = `${body.user_id}:${code}`;
      const prior = seenIdempotency.get(String(key));
      if (prior) {
        if (prior.body !== bodyKey) {
          return jsonResponse(
            { message: "Idempotency-Key was reused with a different body." },
            422,
          );
        }
        return jsonResponse(prior.redemption);
      }

      const coupon = couponState.find((item) => item.code === code);
      if (!coupon) {
        return jsonResponse({ message: "Coupon not found." }, 404);
      }
      if (coupon.status === "exhausted" || coupon.remaining < 1) {
        return jsonResponse({ message: "Coupon is exhausted." }, 422);
      }
      if (coupon.status === "expired") {
        return jsonResponse({ message: "Coupon is expired." }, 422);
      }

      const updated: CouponRecord = {
        ...coupon,
        remaining: coupon.remaining - 1,
        status: coupon.remaining - 1 <= 0 ? "exhausted" : coupon.status,
      };
      couponState = couponState.map((item) =>
        item._id === coupon._id ? updated : item,
      );
      const redemption: RedemptionRecord = {
        _id: `r-${redemptionState.length + 1}`,
        coupon_id: coupon._id,
        code: coupon.code,
        user_id: String(body.user_id ?? "u1"),
        discount_percent: coupon.discount_percent,
        idempotency_key: String(key),
        redeemed_at: "2026-08-11T12:00:00.000Z",
      };
      redemptionState = [redemption, ...redemptionState];
      seenIdempotency.set(String(key), { body: bodyKey, redemption });
      recomputeSummary();
      return jsonResponse(redemption);
    }

    return jsonResponse({ message: `Unhandled mock route: ${method} ${path}` }, 500);
  });
}

describe("coupon redeem UI", () => {
  beforeEach(() => {
    couponState = structuredClone(coupons);
    redemptionState = [];
    seenIdempotency.clear();
    recomputeSummary();
  });

  test("[UI] The coupon list, summary, and redemptions load on first render", async () => {
    installCouponFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);

    expect(await screen.findByTestId("coupon-list")).toBeInTheDocument();
    expect(screen.getByTestId("redemption-list")).toBeInTheDocument();
    expect(screen.getByTestId("c1-coupon-code")).toHaveTextContent("WELCOME10");
    expect(screen.getByTestId("summary-active")).toHaveTextContent("2");
    expect(screen.getByTestId("summary-exhausted")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-redemptions")).toHaveTextContent("0");
  });

  test("[UI] Redeeming a coupon updates remaining and the redemption list", async () => {
    installCouponFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("coupon-list");

    await userEvent.type(
      screen.getByRole("textbox", { name: /coupon code/i }),
      "WELCOME10",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /redeem coupon/i }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("c1-coupon-remaining")).toHaveTextContent("4");
      expect(screen.getByTestId("summary-redemptions")).toHaveTextContent("1");
      expect(screen.getByTestId("redemption-list").children.length).toBe(1);
    });
  });

  test("[UI] An unprocessable redeem shows the unprocessable message", async () => {
    installCouponFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("coupon-list");

    await userEvent.type(
      screen.getByRole("textbox", { name: /coupon code/i }),
      "GONE15",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /redeem coupon/i }),
    );

    expect(await screen.findByTestId("unprocessable-message")).toBeInTheDocument();
  });
});
