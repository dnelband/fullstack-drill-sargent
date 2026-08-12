import type { ChallengeServerModule } from "../../../../server/types.ts";

const exerciseHoldQueueServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    // Implement routes — see challenge README.
    void app;
    void db;
  },
};

export default exerciseHoldQueueServer;
export { exerciseHoldQueueServer };
