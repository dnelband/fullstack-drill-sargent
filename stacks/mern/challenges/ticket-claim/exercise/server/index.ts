import type { ChallengeServerModule } from "../../../../server/types.ts";

const exerciseTicketClaimServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    // Implement routes — see challenge README.
    void app;
    void db;
  },
};

export default exerciseTicketClaimServer;
export { exerciseTicketClaimServer };
