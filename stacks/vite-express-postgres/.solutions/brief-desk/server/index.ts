import type { ChallengeServerModule } from "../../../server/types.ts";

const referenceBriefDeskServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // Implement routes — see challenge README.
    void app;
    void pool;
  },
};

export default referenceBriefDeskServer;
export { referenceBriefDeskServer };
