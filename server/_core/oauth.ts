import type { Express } from "express";

/**
 * Clerk handles authentication entirely on the client side.
 * The old Manus /api/oauth/callback route is no longer needed.
 * This stub is kept so existing import sites don't break during migration.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function registerOAuthRoutes(_app: Express): void {
  // No-op: Clerk auth is managed by @clerk/react on the frontend
  // and verified via clerkMiddleware() + getAuth() on the backend.
}
