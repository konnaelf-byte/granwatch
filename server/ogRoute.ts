import { Express } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { elders } from "../drizzle/schema";

const DEFAULT_OG_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663467284809/kPXP5TfTQ4hUuXDHU4e2Bo/gran-icon-final_a6b9501a.png";
const APP_URL = "https://granwatch.com";

function buildOgHtml({
  title,
  description,
  image,
  url,
  redirectUrl,
}: {
  title: string;
  description: string;
  image: string;
  url: string;
  redirectUrl: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="GranWatch" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <!-- WhatsApp / iMessage use og: tags above -->

  <!-- Redirect to the actual page -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}" />
  <script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
</head>
<body>
  <p>Redirecting to GranWatch…</p>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function registerOgRoutes(app: Express) {
  // Dynamic OG page for invite links: /api/og/invite/:code
  app.get("/api/og/invite/:code", async (req, res) => {
    const { code } = req.params;

    try {
      const db = await getDb();
      let elderName: string | null = null;
      let elderPhoto: string | null = null;

      if (db) {
        const result = await db
          .select({ name: elders.name, photoUrl: elders.photoUrl })
          .from(elders)
          .where(eq(elders.inviteCode, code))
          .limit(1);

        if (result.length > 0) {
          elderName = result[0].name;
          elderPhoto = result[0].photoUrl ?? null;
        }
      }

      const redirectUrl = `${APP_URL}/join/${code}`;

      if (elderName) {
        const image = elderPhoto || DEFAULT_OG_IMAGE;
        const title = `Join ${elderName}'s family on GranWatch`;
        const description = `You've been invited to help keep an eye on ${elderName}. Join the family, log visits, and make sure she's never forgotten. 💛`;

        const canonicalUrl = `${APP_URL}/api/og/invite/${code}`;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300"); // 5 min cache
        return res.send(buildOgHtml({ title, description, image, url: canonicalUrl, redirectUrl }));
      }
    } catch (err) {
      console.error("[OG] Error fetching elder for invite code:", err);
    }

    // Fallback: generic invite preview
    const title = "You're invited to GranWatch";
    const description = "Join a family on GranWatch — the app that makes sure Gran is never forgotten. Log visits, share updates, and keep the whole family connected. 💛";
    const fallbackCanonical = `${APP_URL}/api/og/invite/${req.params.code}`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(buildOgHtml({
      title,
      description,
      image: DEFAULT_OG_IMAGE,
      url: fallbackCanonical,
      redirectUrl: `${APP_URL}/join/${req.params.code}`,
    }));
  });

  // Generic app share OG page: /api/og/share
  app.get("/api/og/share", (_req, res) => {
    const title = "GranWatch — Let's take good care of Gran";
    const description = "Keep the whole family connected around the people who matter most. Log visits, set reminders, and make sure Gran is never forgotten. 💛";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600"); // 1 hour cache
    res.send(buildOgHtml({
      title,
      description,
      image: DEFAULT_OG_IMAGE,
      url: `${APP_URL}/api/og/share`,
      redirectUrl: APP_URL,
    }));
  });
}
