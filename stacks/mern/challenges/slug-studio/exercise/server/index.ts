import type { ChallengeServerModule } from "../../../../server/types.ts";

const exerciseSlugStudioServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    // Implement /api/pages, PATCH, publish, unpublish, and /api/public/:slug.
    // Versioned writes must use atomic {_id, version} filters. 409 includes latest.
    // Slug conflicts include conflicting_page. See challenge README.
    void app;
    void db;
  },
};

export default exerciseSlugStudioServer;
export { exerciseSlugStudioServer };
