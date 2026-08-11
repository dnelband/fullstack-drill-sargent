import type { ChallengeServerModule } from "../../../server/types.ts";

const referenceOrdersInboxServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // Implement routes — see challenge README.
    void app;
    void pool;
  },
};

export default referenceOrdersInboxServer;
export { referenceOrdersInboxServer };
