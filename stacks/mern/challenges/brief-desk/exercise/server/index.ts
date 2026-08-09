import type { ChallengeServerModule } from "../../../../server/types.ts";

const exerciseBriefDeskServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    // Implement /api/members, /api/summary, /api/briefs, claim, and PATCH.
    // Versioned writes must use atomic {_id, version} filters. 409 includes latest.
    // Claim is open→claimed only; second claim is 409. See challenge README.
    void app;
    void db;
  },
};

export default exerciseBriefDeskServer;
export { exerciseBriefDeskServer };
