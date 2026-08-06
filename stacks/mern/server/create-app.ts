import express from "express";
import cors from "cors";
import { currentChallenge } from "../config/current-challenge.ts";
import { getDb } from "./db.ts";
import { loadChallengeServerModule } from "./load-challenge-server.ts";

export async function createApp() {
  const app = express();
  const db = await getDb();

  app.use(
    cors({
      origin: true,
      credentials: false,
    }),
  );
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.json({
      ok: true,
      challenge: currentChallenge.slug,
    });
  });

  const module = await loadChallengeServerModule();
  await module.registerRoutes({ app, db });

  return app;
}
