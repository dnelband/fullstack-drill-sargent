import type { ChallengeServerModule } from "../../../../server/types.ts";

const exerciseTicketClaimServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // Implement routes — see challenge README.
    void app;
    void pool;
  },
};

export default exerciseTicketClaimServer;
export { exerciseTicketClaimServer };
