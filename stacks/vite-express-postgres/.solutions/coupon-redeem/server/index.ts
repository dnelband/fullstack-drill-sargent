import type { ChallengeServerModule } from "../../../server/types.ts";

const referenceCouponRedeemServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // Implement routes — see challenge README.
    void app;
    void pool;
  },
};

export default referenceCouponRedeemServer;
export { referenceCouponRedeemServer };
