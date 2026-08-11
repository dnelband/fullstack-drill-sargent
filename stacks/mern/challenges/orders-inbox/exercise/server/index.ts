import type { ChallengeServerModule } from "../../../../server/types.ts";

const exerciseOrdersInboxServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    // Implement GET /api/orders and GET /api/orders/summary.
    // Invalid status → 400. List ordered by created_at desc. See README.
    void app;
    void db;
  },
};

export default exerciseOrdersInboxServer;
export { exerciseOrdersInboxServer };
