import type { ChallengeServerModule } from "../../../../server/types.ts";

const exerciseSeatHoldServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    // Implement routes — see challenge README.
    void app;
    void db;
  },
};

export default exerciseSeatHoldServer;
export { exerciseSeatHoldServer };
