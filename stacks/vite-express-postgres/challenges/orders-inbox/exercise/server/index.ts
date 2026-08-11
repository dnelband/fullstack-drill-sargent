import type { ChallengeServerModule } from "../../../../server/types.ts";

const exerciseOrdersInboxServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // Implement routes — see challenge README.
    void app;
    void pool;
  },
};

export default exerciseOrdersInboxServer;
export { exerciseOrdersInboxServer };
