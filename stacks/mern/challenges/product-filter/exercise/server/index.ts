import type { ChallengeServerModule } from "../../../../server/types.ts";

const exerciseProductFilterServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    // Implement POST /api/products/query with stackable filters.
    // Empty filters → all products by name asc. Invalid filter → 400.
    // See challenge README.
    void app;
    void db;
  },
};

export default exerciseProductFilterServer;
export { exerciseProductFilterServer };
