import type { ChallengeServerModule } from "../../../../server/types.ts";

const exerciseCouponRedeemServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    // Implement routes — see challenge README.
    void app;
    void db;
  },
};

export default exerciseCouponRedeemServer;
export { exerciseCouponRedeemServer };
