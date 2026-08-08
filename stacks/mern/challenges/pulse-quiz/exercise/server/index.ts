import type { ChallengeServerModule } from "../../../../server/types.ts";

const exercisePulseQuizServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    // Implement /api/quiz/config, /api/questions/next, and /api/answers.
    // Every finished attempt must return HTTP 200 with a complete AttemptResult.
    // 409 only when the serve was already consumed. See challenge README.
    void app;
    void db;
  },
};

export default exercisePulseQuizServer;
export { exercisePulseQuizServer };
