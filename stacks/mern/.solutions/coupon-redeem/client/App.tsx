import { useEffect, useState } from "react";
import {
  ApiError,
  fetchCouponSummary,
  fetchCoupons,
  fetchRedemptions,
  redeemCoupon,
} from "./api.ts";
import { CURRENT_USER_ID } from "../../../shared/coupon-redeem.ts";
import {
  COUPON_STATUS_OPTIONS,
  type CouponRecord,
  type CouponStatus,
  type CouponSummary,
  type RedemptionRecord,
} from "../../../shared/types.ts";

function newIdempotencyKey() {
  return crypto.randomUUID();
}

export function ChallengeApp() {
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);
  const [summary, setSummary] = useState<CouponSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<CouponStatus | "all">("all");
  const [code, setCode] = useState("");
  const [unprocessableMessage, setUnprocessableMessage] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  async function refreshBoard(status: CouponStatus | "all" = statusFilter) {
    const [nextCoupons, nextSummary, nextRedemptions] = await Promise.all([
      fetchCoupons(status),
      fetchCouponSummary(),
      fetchRedemptions(),
    ]);
    setCoupons(nextCoupons);
    setSummary(nextSummary);
    setRedemptions(nextRedemptions);
  }

  useEffect(() => {
    setIsLoading(true);
    void refreshBoard("all").finally(() => setIsLoading(false));
  }, []);

  async function handleStatusChange(next: CouponStatus | "all") {
    setStatusFilter(next);
    setUnprocessableMessage(null);
    setCoupons(await fetchCoupons(next));
  }

  async function handleRedeem() {
    setUnprocessableMessage(null);
    try {
      await redeemCoupon(
        { code: code.trim(), user_id: CURRENT_USER_ID },
        newIdempotencyKey(),
      );
      setCode("");
      await refreshBoard();
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setUnprocessableMessage(error.message);
        await refreshBoard();
        return;
      }
      setUnprocessableMessage(
        error instanceof Error ? error.message : "Redeem failed",
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">
            Coupon Redeem
          </p>
          <h1 className="text-3xl font-semibold">Redeem store coupons</h1>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase text-slate-400">Active</p>
            <p data-testid="summary-active" className="text-2xl font-semibold">
              {summary?.active ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase text-slate-400">Expired</p>
            <p data-testid="summary-expired" className="text-2xl font-semibold">
              {summary?.expired ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase text-slate-400">Exhausted</p>
            <p
              data-testid="summary-exhausted"
              className="text-2xl font-semibold"
            >
              {summary?.exhausted ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase text-slate-400">Redemptions</p>
            <p
              data-testid="summary-redemptions"
              className="text-2xl font-semibold"
            >
              {summary?.redemptions ?? "—"}
            </p>
          </div>
        </div>

        <label className="flex max-w-xs flex-col gap-1 text-sm">
          <span className="text-slate-400">Status filter</span>
          <select
            aria-label="Status filter"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={statusFilter}
            onChange={(event) =>
              void handleStatusChange(event.target.value as CouponStatus | "all")
            }
          >
            <option value="all">all</option>
            {COUPON_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleRedeem();
          }}
        >
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
            <span className="text-slate-400">Coupon code</span>
            <input
              aria-label="Coupon code"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium hover:bg-emerald-600"
          >
            Redeem coupon
          </button>
        </form>

        {unprocessableMessage && (
          <p
            data-testid="unprocessable-message"
            className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
          >
            {unprocessableMessage}
          </p>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-medium">
            {isLoading ? "Loading…" : `Coupons (${coupons.length})`}
          </h2>
          <ul data-testid="coupon-list" className="space-y-3">
            {coupons.map((coupon) => (
              <li
                key={coupon._id}
                data-testid={`${coupon._id}-coupon-row`}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
              >
                <p className="font-medium">{coupon.title}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-300">
                  <span data-testid={`${coupon._id}-coupon-code`}>
                    {coupon.code}
                  </span>
                  <span data-testid={`${coupon._id}-coupon-status`}>
                    {coupon.status}
                  </span>
                  <span data-testid={`${coupon._id}-coupon-remaining`}>
                    {coupon.remaining}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">
            Redemptions ({redemptions.length})
          </h2>
          <ul data-testid="redemption-list" className="space-y-2">
            {redemptions.map((item) => (
              <li
                key={item._id}
                data-testid={`${item._id}-redemption-row`}
                className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm"
              >
                {item.code} · {item.discount_percent}% · {item.user_id}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
