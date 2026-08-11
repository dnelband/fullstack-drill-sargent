import type { ChallengeServerModule } from "../../../server/types.ts";

const referenceSlugStudioServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // Implement routes — see challenge README.
    void app;
    void pool;
  },
};

export default referenceSlugStudioServer;
export { referenceSlugStudioServer };
