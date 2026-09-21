import { createContext } from "react-router";

export type CloudflareEnv = {
  ANTHROPIC_API_KEY: string;
  MODEL?: string;
  DB: D1Database;
  /* Lower only if you must run on the Workers free tier; see auth.server.ts. */
  PBKDF2_ITERATIONS?: string;
};

/* Shared by workers/app.ts (sets it) and routes (read it).
   Kept in its own module so the worker entry and the routes do not import
   each other. */
export const cloudflareContext = createContext<{
  env: CloudflareEnv;
  ctx: ExecutionContext;
}>();
