import type { ChallengeServerModule } from "../../../../server/types.ts";

const exerciseSlugStudioServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // Implement routes — see challenge README.
    void app;
    void pool;
  },
};

export default exerciseSlugStudioServer;
export { exerciseSlugStudioServer };
