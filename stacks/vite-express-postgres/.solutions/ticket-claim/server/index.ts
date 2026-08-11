import type { ChallengeServerModule } from "../../../server/types.ts";

const referenceTicketClaimServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // Implement routes — see challenge README.
    void app;
    void pool;
  },
};

export default referenceTicketClaimServer;
export { referenceTicketClaimServer };
