import type { ChallengeServerModule } from "../../../server/types.ts";

const referenceProductFilterServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // Implement routes — see challenge README.
    void app;
    void pool;
  },
};

export default referenceProductFilterServer;
export { referenceProductFilterServer };
