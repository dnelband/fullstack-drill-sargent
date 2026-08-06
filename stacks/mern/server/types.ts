import type { Express } from "express";
import type { Db } from "mongodb";

export interface ChallengeDependencies {
  app: Express;
  db: Db;
}

export interface ChallengeServerModule {
  registerRoutes(deps: ChallengeDependencies): Promise<void> | void;
}
