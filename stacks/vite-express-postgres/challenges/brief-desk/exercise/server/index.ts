import type { ChallengeServerModule } from "../../../../server/types.ts";

const exerciseBriefDeskServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // Implement routes — see challenge README.
    void app;
    void pool;
  },
};

export default exerciseBriefDeskServer;
export { exerciseBriefDeskServer };
