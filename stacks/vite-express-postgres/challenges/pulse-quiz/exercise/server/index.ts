import type { ChallengeServerModule } from "../../../../server/types.ts";

const exercisePulseQuizServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // Implement routes — see challenge README.
    void app;
    void pool;
  },
};

export default exercisePulseQuizServer;
export { exercisePulseQuizServer };
