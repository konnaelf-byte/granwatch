/**
 * PayFast integration — DEPRECATED.
 *
 * GranWatch migrated from PayFast to Lemon Squeezy in May 2026.
 * These routes are intentionally disabled to avoid the unauthenticated
 * /api/payfast/verify endpoint being abused to activate Gran+ for free.
 *
 * The routes are still registered so existing bookmarked URLs get a
 * clear 410 Gone response rather than a 404 / silent failure.
 */

import type { Express, Request, Response } from "express";

export function registerPayfastRoutes(app: Express) {
  const gone = (_req: Request, res: Response) => {
    res.status(410).json({
      error: "PayFast integration has been replaced by Lemon Squeezy. This endpoint is no longer active.",
    });
  };

  app.get("/api/payfast/checkout", gone);
  app.post("/api/payfast/verify", gone);
  app.post("/api/payfast/itn", gone);
}

// Kept for TypeScript compatibility — nothing below is used.
export function buildPayfastCheckout(_opts: unknown): never {
  throw new Error("PayFast is no longer active — use Lemon Squeezy.");
}
