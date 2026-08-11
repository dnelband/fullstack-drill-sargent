import type { ChallengeServerModule } from "../../../server/types.ts";

const referencePulseQuizServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // Implement routes — see challenge README.
    void app;
    void pool;
  },
};

export default referencePulseQuizServer;
export { referencePulseQuizServer };
