// GranWatch Marketing Engine — publish rail (Postiz public API).
//
// Run from the project root — reads POSTIZ_API_KEY from .env (same pattern as the other scripts).
//
//   node scripts/marketing-publish.mjs --channels
//       list connected channels (id, provider, name)
//   node scripts/marketing-publish.mjs --post "Marketing Engine/QUEUE/2026-09-08-post.json" [--dry-run]
//       publish/schedule one post spec (see shape below)
//
// Post spec (JSON):
// {
//   "content": "text of the post",                 // required
//   "image": "Marketing Engine/media/xyz.png",      // optional; local path or https URL (Instagram REQUIRES an image)
//   "channels": ["facebook", "instagram"],          // provider identifiers, or channel ids; default: all enabled
//   "when": "now" | "draft" | "2026-09-08T04:30:00Z", // default "draft"
//   "link": "https://granwatch.app/?ref=..."        // optional; Facebook link attachment
// }
//
// Postiz docs: https://docs.postiz.com/public-api  — rate limit ~100 create-post calls/hour.

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.POSTIZ_API_URL || "https://api.postiz.com/public/v1";
const KEY = process.env.POSTIZ_API_KEY;
if (!KEY) { console.error("POSTIZ_API_KEY is not set in .env"); process.exit(1); }

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined; };
const dryRun = flag("dry-run");

async function api(method, route, body, isForm = false) {
  const res = await fetch(`${BASE}${route}`, {
    method,
    headers: { Authorization: KEY, ...(isForm ? {} : { "Content-Type": "application/json" }) },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status}: ${typeof data === "string" ? data.slice(0, 300) : JSON.stringify(data).slice(0, 300)}`);
  return data;
}

async function channels() {
  const list = await api("GET", "/integrations");
  const rows = Array.isArray(list) ? list : list.integrations ?? [];
  if (!rows.length) { console.log("No channels connected."); return rows; }
  for (const c of rows) {
    console.log(`  ${String(c.id).padEnd(28)} ${String(c.providerIdentifier ?? c.identifier ?? "?").padEnd(16)} ${c.name ?? ""}${c.disabled ? "  [disabled]" : ""}`);
  }
  return rows;
}

// Settings block per provider (Postiz requires __type).
function settingsFor(provider, spec) {
  switch (provider) {
    case "facebook": return { __type: "facebook", post_type: "post", ...(spec.link ? { url: spec.link } : {}) };
    case "instagram": return { __type: "instagram", post_type: "post" };
    case "instagram-standalone": return { __type: "instagram-standalone", post_type: "post" };
    case "linkedin": return { __type: "linkedin" };
    case "linkedin-page": return { __type: "linkedin-page" };
    case "threads": return { __type: "threads" };
    default: return { __type: provider };
  }
}

async function uploadImage(image) {
  let buf, name;
  if (/^https?:\/\//.test(image)) {
    const r = await fetch(image);
    if (!r.ok) throw new Error(`image download failed: ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    name = path.basename(new URL(image).pathname) || "image.jpg";
  } else {
    buf = fs.readFileSync(image);
    name = path.basename(image);
  }
  const form = new FormData();
  form.append("file", new Blob([buf]), name);
  const up = await api("POST", "/upload", form, true);
  return { id: up.id, path: up.path };
}

async function post(specFile) {
  const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
  if (!spec.content) throw new Error("spec.content is required");
  const all = await api("GET", "/integrations");
  const rows = (Array.isArray(all) ? all : all.integrations ?? [])
    .map((c) => ({ ...c, provider: c.providerIdentifier ?? c.identifier ?? c.provider }))
    .filter((c) => !c.disabled);
  const want = spec.channels?.length ? spec.channels : rows.map((c) => c.provider);
  const targets = rows.filter((c) => want.includes(c.provider) || want.includes(c.id));
  if (!targets.length) throw new Error(`no connected channel matches ${JSON.stringify(want)}`);

  const needsImage = targets.some((c) => String(c.provider).startsWith("instagram"));
  if (needsImage && !spec.image) throw new Error("Instagram requires an image — add spec.image or drop instagram from channels");

  let image = [];
  if (spec.image) {
    if (dryRun) image = [{ id: "dry-run", path: spec.image }];
    else image = [await uploadImage(spec.image)];
  }

  const when = spec.when ?? "draft";
  const type = when === "now" ? "now" : when === "draft" ? "draft" : "schedule";
  const body = {
    type,
    date: type === "schedule" ? new Date(when).toISOString() : new Date().toISOString(),
    shortLink: false,
    tags: [],
    posts: targets.map((c) => ({
      integration: { id: c.id },
      value: [{ content: spec.content, image }],
      settings: settingsFor(c.provider, spec),
    })),
  };

  if (dryRun) { console.log("[dry-run] would POST /posts:"); console.log(JSON.stringify(body, null, 2)); return; }
  const res = await api("POST", "/posts", body);
  console.log(`${type === "now" ? "Published" : type === "draft" ? "Saved as draft" : "Scheduled for " + body.date} → ${targets.map((c) => c.provider).join(", ")}`);
  console.log(JSON.stringify(res));
}

try {
  if (flag("channels")) await channels();
  else if (opt("post")) await post(opt("post"));
  else console.log("Usage: --channels | --post <spec.json> [--dry-run]");
} catch (e) {
  console.error("Error:", e.message);
  process.exit(1);
}
