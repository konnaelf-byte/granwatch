import "dotenv/config";
import { clerkMiddleware } from "@clerk/express";
import express from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import helmet from "helmet";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerPayfastRoutes } from "../payfastRoute";
import { registerLemonSqueezyRoutes } from "../lemonSqueezyRoute";
import { registerRevenueCatRoutes } from "../revenueCatRouter";
import { registerOgRoutes } from "../ogRoute";
import { registerUploadRoutes } from "../uploadRoute";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { startCronJobs } from "../cron";
import { runMigrations } from "./migrateDb";
import { getDb } from "../db";
import { pushTokens } from "../../drizzle/schema";
import { ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// ── Rate limiter — tRPC API (not webhooks, which have their own auth) ────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                  // 300 requests per IP per window — generous for a family app
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please try again in a few minutes." },
});

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── Security headers (helmet) ──────────────────────────────────────────────
  // CSP disabled — Vite SPA uses inline scripts + dynamic imports.
  // crossOriginEmbedderPolicy disabled — Capacitor WebView compatibility.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // ── Well-known deep-linking verification files ─────────────────────────────
  // These MUST be served before any auth middleware and must NOT redirect.
  // Apple's AASA crawler and Google's Digital Asset Links verifier both
  // require a direct 200 response with Content-Type: application/json.

  // iOS Universal Links — Apple App Site Association
  app.get("/.well-known/apple-app-site-association", (_req, res) => {
    const filePath = path.resolve(import.meta.dirname, "public", ".well-known", "apple-app-site-association");
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(filePath);
  });

  // Android App Links — Digital Asset Links
  app.get("/.well-known/assetlinks.json", (_req, res) => {
    const filePath = path.resolve(import.meta.dirname, "public", ".well-known", "assetlinks.json");
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(filePath);
  });

  // ── Notification diagnostics (public: booleans + counts only, no secrets) ────
  // Turns "nothing arrives, no idea why" into a concrete checklist. Reports
  // whether the email/push credentials are wired and whether ANY device has
  // registered a push token — without exposing any credential values.
  app.get("/api/health/notifications", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");

    // Firebase: present AND valid JSON carrying the fields the Admin SDK needs.
    let firebaseConfigured = false;
    let firebaseProjectId: string | null = null;
    if (ENV.firebaseServiceAccount) {
      try {
        const parsed = JSON.parse(ENV.firebaseServiceAccount);
        firebaseProjectId = parsed.project_id ?? null;
        firebaseConfigured = !!(parsed.project_id && parsed.private_key && parsed.client_email);
      } catch {
        firebaseConfigured = false; // present but not parseable (minification/escaping issue)
      }
    }

    // How many devices have registered for push (any user).
    let pushTokenCount = 0;
    const pushByPlatform: Record<string, number> = {};
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.select({ platform: pushTokens.platform }).from(pushTokens);
        pushTokenCount = rows.length;
        for (const r of rows) {
          const p = r.platform ?? "unknown";
          pushByPlatform[p] = (pushByPlatform[p] ?? 0) + 1;
        }
      }
    } catch {
      /* leave count at 0 */
    }

    res.json({
      email: {
        resendKeySet: !!ENV.resendApiKey,
        fromEmail: ENV.resendFromEmail,
      },
      push: {
        firebaseJsonPresent: !!ENV.firebaseServiceAccount,
        firebaseConfigured,
        firebaseProjectId,
        pushTokenCount,
        pushByPlatform,
      },
      cron: {
        schedule: "Daily 18:00 UTC (20:00 SAST)",
        note: "Push/email only fire when a gran crosses a 14/21-day or birthday threshold.",
      },
      serverTimeUtc: new Date().toISOString(),
    });
  });

  // ── Widget-sync diagnostics (public, ephemeral, in-memory) ──────────────────
  // The native widget stays blank if the app never writes gran data into the
  // shared App Group. The app's JS loads live, so it POSTs the result of each
  // widget-sync attempt here — letting us see whether the write ran, how many
  // grans, and any error, WITHOUT needing device logs. Last report wins.
  let lastWidgetSync: Record<string, unknown> | null = null;
  app.post("/api/debug/widget-sync", express.json({ limit: "8kb" }), (req, res) => {
    lastWidgetSync = { ...(req.body ?? {}), serverAt: new Date().toISOString() };
    console.log("[WidgetSync]", JSON.stringify(lastWidgetSync));
    res.json({ ok: true });
  });
  app.get("/api/health/widget", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ lastWidgetSync });
  });

  // ── Gift redirect (public — used from notification EMAILS) ──────────────────
  // Resolves the gift partner for the gran's country, logs the click with the
  // -1 "email click" sentinel, and forwards. Highest-intent placement: the
  // birthday and overdue-visit emails.
  app.get("/api/gift/:elderId/:category", async (req, res) => {
    try {
      const elderId = parseInt(req.params.elderId, 10);
      const category = req.params.category as "flowers" | "gift";
      if (!Number.isFinite(elderId) || !["flowers", "gift"].includes(category)) {
        return res.redirect("https://granwatch.app/dashboard");
      }
      const { getDb } = await import("../db");
      const { elders, giftLogs } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { resolveGiftOptions } = await import("../giftPartners");

      const db = await getDb();
      const [elder] = db
        ? await db.select({ country: elders.country }).from(elders).where(eq(elders.id, elderId)).limit(1)
        : [undefined];
      const option = resolveGiftOptions(elder?.country).find((p) => p.category === category);
      if (!option) return res.redirect("https://granwatch.app/dashboard");

      // Best-effort click log (sentByUserId -1 = clicked from an email, not in-app)
      if (db) {
        try {
          await db.insert(giftLogs).values({
            elderId,
            sentByUserId: -1,
            giftType: category,
            partnerName: `${option.id} (email)`,
          });
        } catch { /* non-fatal */ }
      }
      return res.redirect(option.url);
    } catch {
      return res.redirect("https://granwatch.app/dashboard");
    }
  });

  // ── Auth + application middleware ──────────────────────────────────────────

  // Clerk authentication middleware — must be first so getAuth() works everywhere.
  app.use(clerkMiddleware());

  // Payfast ITN webhook: raw urlencoded body, must come before json parser.
  registerPayfastRoutes(app);

  // Lemon Squeezy webhook: raw body required for signature verification.
  registerLemonSqueezyRoutes(app);

  // RevenueCat webhook: native IAP lifecycle events (iOS + Android).
  registerRevenueCatRoutes(app);

  // OG image generation.
  registerOgRoutes(app);

  // Configure body parser — 2mb is generous for a JSON API.
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  // Photo upload route.
  registerUploadRoutes(app);

  // tRPC API — rate-limited.
  app.use(
    "/api/trpc",
    apiLimiter,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Development mode uses Vite dev server (lazy import so `vite` is not
  // required in production node_modules); production serves the pre-built
  // static files from dist/public.
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);
  } else {
    const distPath = path.resolve(import.meta.dirname, "public");
    if (!fs.existsSync(distPath)) {
      console.error(`Build directory not found: ${distPath}. Run 'pnpm build' first.`);
    }
    app.use(express.static(distPath));
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    startCronJobs();
  });
}

// Run DB migrations then start the HTTP server.
runMigrations()
  .then(() => startServer())
  .catch(console.error);
