import type { ChallengeServerModule } from "../../../../server/types.ts";

const exerciseProductFilterServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // Implement routes — see challenge README.
    void app;
    void pool;
  },
};

export default exerciseProductFilterServer;
export { exerciseProductFilterServer };
