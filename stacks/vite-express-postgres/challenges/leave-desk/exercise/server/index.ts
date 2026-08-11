import type { ChallengeServerModule } from "../../../../server/types.ts";

const exerciseLeaveDeskServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // Implement routes — see challenge README.
    void app;
    void pool;
  },
};

export default exerciseLeaveDeskServer;
export { exerciseLeaveDeskServer };
