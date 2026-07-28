import { Express } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { elders } from "../drizzle/schema";

const APP_URL = process.env.APP_URL ?? "https://granwatch.app";
// Self-hosted branded share card — 1200x630 (client/public/og-default.png).
// No third-party CDN dependency. Dimensions are declared to crawlers below;
// they MUST stay in sync with the actual asset or WhatsApp/iMessage/Twitter
// will mis-render or drop the card entirely.
const DEFAULT_OG_IMAGE = `${APP_URL}/og-default.png`;
const DEFAULT_OG_IMAGE_WIDTH = 1200;
const DEFAULT_OG_IMAGE_HEIGHT = 630;

function buildOgHtml({
  title,
  description,
  image,
  url,
  redirectUrl,
  imageWidth,
  imageHeight,
}: {
  title: string;
  description: string;
  image: string;
  url: string;
  redirectUrl: string;
  /**
   * Only pass these when the real pixel dimensions of `image` are known.
   * Declaring dimensions that don't match the asset is worse than declaring
   * none at all — crawlers letterbox, crop or reject the card.
   */
  imageWidth?: number;
  imageHeight?: number;
}) {
  const dimensionMeta =
    imageWidth && imageHeight
      ? `
  <meta property="og:image:width" content="${imageWidth}" />
  <meta property="og:image:height" content="${imageHeight}" />`
      : "";

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
  <meta property="og:image" content="${escapeHtml(image)}" />${dimensionMeta}
  <meta property="og:site_name" content="GranWatch" />

  <!-- Twitter Card. summary_large_image is only safe when we know the asset is
       wide (the 1200x630 default card). An arbitrary elder photo may be square
       or portrait, in which case the smaller summary card renders correctly. -->
  <meta name="twitter:card" content="${
    imageWidth && imageHeight && imageWidth >= imageHeight * 1.5
      ? "summary_large_image"
      : "summary"
  }" />
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
        // Elder photo must be an absolute URL for WhatsApp/iMessage crawlers;
        // prefix relative paths with the app origin.
        const image = elderPhoto
          ? elderPhoto.startsWith("http")
            ? elderPhoto
            : `${APP_URL}${elderPhoto.startsWith("/") ? "" : "/"}${elderPhoto}`
          : DEFAULT_OG_IMAGE;
        const title = `Join ${elderName}'s family on GranWatch`;
        const description = `You've been invited to help keep an eye on ${elderName}. Join the family, log visits, and make sure she's never forgotten. 💛`;

        // We only know the pixel size of our own default card. Elder photos are
        // user-uploaded at arbitrary sizes, so we declare no dimensions for
        // them rather than lying to the crawler.
        const usingDefaultImage = image === DEFAULT_OG_IMAGE;

        const canonicalUrl = `${APP_URL}/api/og/invite/${code}`;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300"); // 5 min cache
        return res.send(buildOgHtml({
          title,
          description,
          image,
          url: canonicalUrl,
          redirectUrl,
          imageWidth: usingDefaultImage ? DEFAULT_OG_IMAGE_WIDTH : undefined,
          imageHeight: usingDefaultImage ? DEFAULT_OG_IMAGE_HEIGHT : undefined,
        }));
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
      imageWidth: DEFAULT_OG_IMAGE_WIDTH,
      imageHeight: DEFAULT_OG_IMAGE_HEIGHT,
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
      imageWidth: DEFAULT_OG_IMAGE_WIDTH,
      imageHeight: DEFAULT_OG_IMAGE_HEIGHT,
      url: `${APP_URL}/api/og/share`,
      redirectUrl: APP_URL,
    }));
  });
}
