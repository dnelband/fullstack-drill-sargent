import type { ChallengeServerModule } from "../../../server/types.ts";

const referenceLeaveDeskServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // Implement routes — see challenge README.
    void app;
    void pool;
  },
};

export default referenceLeaveDeskServer;
export { referenceLeaveDeskServer };
