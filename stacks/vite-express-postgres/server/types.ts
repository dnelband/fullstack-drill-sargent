import type { Express } from "express";
import type { Pool } from "pg";
import type {
  Agent,
  CallbackRecord,
  CallbackSummary,
  ClaimCallbackInput,
  UpdateCallbackInput,
} from "../shared/types.ts";

export interface ChallengeDependencies {
  app: Express;
  pool: Pool;
}

export interface ChallengeServerModule {
  registerRoutes(deps: ChallengeDependencies): Promise<void> | void;
}

export interface DispatchBoardApi {
  listAgents(): Promise<Agent[]>;
  listCallbacks(searchParams: URLSearchParams): Promise<CallbackRecord[]>;
  claimCallback(callbackId: number, input: ClaimCallbackInput): Promise<CallbackRecord>;
  updateCallback(callbackId: number, input: UpdateCallbackInput): Promise<CallbackRecord>;
  getSummary(): Promise<CallbackSummary>;
}
