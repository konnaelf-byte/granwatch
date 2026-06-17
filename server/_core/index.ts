import "dotenv/config";
import { clerkMiddleware } from "@clerk/express";
import express from "express";
import fs from "fs";
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

async function startServer() {
  const app = express();
  const server = createServer(app);

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

  // tRPC API.
  app.use(
    "/api/trpc",
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
