import type { ChallengeServerModule } from "../../../../server/types.ts";

const exerciseCouponRedeemServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // Implement routes — see challenge README.
    void app;
    void pool;
  },
};

export default exerciseCouponRedeemServer;
export { exerciseCouponRedeemServer };
