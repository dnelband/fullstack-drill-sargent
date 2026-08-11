import { createHash, randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import type { ChallengeServerModule } from "../../../server/types.ts";
import type {
  CouponRecord,
  CouponStatus,
  CouponSummary,
  IdempotencyRecord,
  RedemptionRecord,
} from "../../../shared/types.ts";
import { COUPON_STATUS_OPTIONS } from "../../../shared/types.ts";

function isCouponStatus(value: string): value is CouponStatus {
  return COUPON_STATUS_OPTIONS.includes(value as CouponStatus);
}

function deriveStatus(
  coupon: Pick<CouponRecord, "remaining" | "expires_at">,
  nowMs = Date.now(),
): CouponStatus {
  if (Date.parse(coupon.expires_at) <= nowMs) {
    return "expired";
  }
  if (coupon.remaining <= 0) {
    return "exhausted";
  }
  return "active";
}

function withDerivedStatus(coupon: CouponRecord, nowMs = Date.now()): CouponRecord {
  return { ...coupon, status: deriveStatus(coupon, nowMs) };
}

function hashRedeemBody(code: string, userId: string): string {
  return createHash("sha256")
    .update(`${userId}:${code.trim().toUpperCase()}`)
    .digest("hex");
}

const referenceCouponRedeemServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    const coupons = db.collection<CouponRecord>("coupons");
    const redemptions = db.collection<RedemptionRecord>("redemptions");
    const idempotencyKeys = db.collection<IdempotencyRecord>("idempotency_keys");

    app.get("/api/coupons/summary", async (_request, response) => {
      const nowMs = Date.now();
      const all = await coupons.find({}).toArray();
      const summary: CouponSummary = {
        active: 0,
        expired: 0,
        exhausted: 0,
        redemptions: await redemptions.countDocuments(),
      };
      for (const coupon of all) {
        summary[deriveStatus(coupon, nowMs)] += 1;
      }
      response.json(summary);
    });

    app.get("/api/coupons", async (request, response) => {
      const raw = request.query.status;
      const statusParam =
        raw === undefined || raw === null
          ? "all"
          : String(Array.isArray(raw) ? raw[0] : raw);

      if (statusParam !== "all" && !isCouponStatus(statusParam)) {
        response.status(400).json({ message: "Invalid status." });
        return;
      }

      const nowMs = Date.now();
      const list = (await coupons.find({}).sort({ code: 1 }).toArray()).map((c) =>
        withDerivedStatus(c, nowMs),
      );
      const filtered =
        statusParam === "all"
          ? list
          : list.filter((coupon) => coupon.status === statusParam);
      response.json(filtered);
    });

    app.get("/api/redemptions", async (_request, response) => {
      const list = await redemptions.find({}).sort({ redeemed_at: -1 }).toArray();
      response.json(list);
    });

    app.post("/api/coupons/redeem", async (request, response) => {
      const idempotencyKey = String(
        request.headers["idempotency-key"] ?? "",
      ).trim();
      if (!idempotencyKey) {
        response.status(400).json({ message: "Idempotency-Key is required." });
        return;
      }

      const code = String(request.body?.code ?? "").trim().toUpperCase();
      const userId = String(request.body?.user_id ?? "").trim();
      if (!code || !userId) {
        response.status(400).json({ message: "code and user_id are required." });
        return;
      }

      const bodyHash = hashRedeemBody(code, userId);
      const idempotencyId = `${userId}::${idempotencyKey}`;
      const existing = await idempotencyKeys.findOne({ _id: idempotencyId });
      if (existing) {
        if (existing.body_hash !== bodyHash) {
          response.status(422).json({
            message: "Idempotency-Key was reused with a different body.",
          });
          return;
        }
        response.status(existing.status_code).json(existing.response);
        return;
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const nowMs = now.getTime();

      const coupon = await coupons.findOne({ code });
      if (!coupon) {
        response.status(404).json({ message: "Coupon not found." });
        return;
      }

      if (deriveStatus(coupon, nowMs) === "expired") {
        response.status(422).json({ message: "Coupon is expired." });
        return;
      }
      if (deriveStatus(coupon, nowMs) === "exhausted") {
        response.status(422).json({ message: "Coupon is exhausted." });
        return;
      }

      const userCount = await redemptions.countDocuments({
        coupon_id: coupon._id,
        user_id: userId,
      });
      if (userCount >= coupon.max_per_user) {
        response.status(422).json({ message: "Per-user redemption limit reached." });
        return;
      }

      const updated = await coupons.findOneAndUpdate(
        {
          _id: coupon._id,
          remaining: { $gte: 1 },
          expires_at: { $gt: nowIso },
        } as Filter<CouponRecord>,
        {
          $inc: { remaining: -1 },
        },
        { returnDocument: "after" },
      );

      if (!updated) {
        const latest = await coupons.findOne({ _id: coupon._id });
        if (!latest) {
          response.status(404).json({ message: "Coupon not found." });
          return;
        }
        const status = deriveStatus(latest, Date.now());
        if (status === "expired") {
          response.status(422).json({ message: "Coupon is expired." });
          return;
        }
        response.status(422).json({ message: "Coupon is exhausted." });
        return;
      }

      const nextStatus = deriveStatus(updated, nowMs);
      if (updated.status !== nextStatus) {
        await coupons.updateOne(
          { _id: updated._id },
          { $set: { status: nextStatus } },
        );
        updated.status = nextStatus;
      }

      const redemption: RedemptionRecord = {
        _id: randomUUID(),
        coupon_id: updated._id,
        code: updated.code,
        user_id: userId,
        discount_percent: updated.discount_percent,
        idempotency_key: idempotencyKey,
        redeemed_at: nowIso,
      };
      await redemptions.insertOne(redemption);

      const record: IdempotencyRecord = {
        _id: idempotencyId,
        user_id: userId,
        key: idempotencyKey,
        body_hash: bodyHash,
        status_code: 200,
        response: redemption,
      };
      await idempotencyKeys.insertOne(record);

      response.status(200).json(redemption);
    });
  },
};

export default referenceCouponRedeemServer;
export { referenceCouponRedeemServer };
