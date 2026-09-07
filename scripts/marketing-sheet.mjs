// GranWatch Marketing Engine — approval board helpers (Google Sheet ⇄ QUEUE specs).
//
// The weekly approval board is a Google Sheet in the shared Drive folder
// "GranWatch Marketing / Engine — For approval". Konna and Chantal edit Headline/Sub/Caption
// and set Status to Approved / Edit / Veto. Nothing publishes unless Status = Approved.
//
//   node scripts/marketing-sheet.mjs --csv --week 2026-09-14
//       print the CSV for that week's specs (Mon..Sun) — the Editor run uploads it as a Google Sheet
//   node scripts/marketing-sheet.mjs --copy-cards --week 2026-09-14
//       copy that week's card PNGs into the Drive mirror so reviewers can see them
//   node scripts/marketing-sheet.mjs --apply board.csv|board.md
//       apply reviewer edits back to the specs (status/headline/sub/caption); re-renders cards when
//       headline or sub changed. Accepts the sheet as CSV, or as the markdown table the Google Drive
//       connector returns (save that text to a file and pass it). Captions are only taken from the
//       sheet when a reviewer actually changed the words (paragraph breaks are restored).
//   node scripts/marketing-sheet.mjs --today
//       print today's (SAST) spec filename and its status, for the Publisher run

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const QUEUE = path.join(ROOT, "Marketing Engine", "QUEUE");
const MIRROR = path.join(process.env.HOME, "Library/CloudStorage/GoogleDrive-d274bg@gmail.com/My Drive/GranWatch Marketing/Engine — For approval");
const COLS = ["Date", "Day", "Status", "Headline", "Sub", "Caption", "Image", "Link", "Notes", "Spec"];

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined; };

const sast = (d = new Date()) => new Date(d.getTime() + 2 * 3600 * 1000).toISOString().slice(0, 10);
const dayName = (iso) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(iso + "T00:00:00Z").getUTCDay()];
const csvq = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function specs() {
  return fs.readdirSync(QUEUE).filter((f) => f.endsWith(".json")).sort().map((f) => ({ file: f, ...JSON.parse(fs.readFileSync(path.join(QUEUE, f), "utf8")) }));
}
function weekFiles(week) {
  const start = new Date(week + "T00:00:00Z"), end = new Date(start.getTime() + 6 * 86400000);
  return specs().filter((s) => { const d = new Date(s.file.slice(0, 10) + "T00:00:00Z"); return d >= start && d <= end; });
}
function parseMdTable(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().startsWith("|"));
  const rows = lines.map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()))
    .filter((r) => !r.every((c) => /^:?-+:?$/.test(c) || c === ""));
  return rows;
}
const norm = (t) => String(t ?? "").replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "").replace(/\s+/g, " ").trim();
const restoreParas = (t) => String(t ?? "").replace(/\s{2,}/g, "\n\n").trim();
function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

if (flag("csv")) {
  const week = opt("week") ?? sast();
  const lines = [COLS.join(",")];
  for (const s of weekFiles(week)) {
    const date = s.file.slice(0, 10);
    const status = { draft: "Draft", approved: "Approved", vetoed: "Veto", published: "Published" }[s.status] ?? s.status;
    lines.push([date, dayName(date), status, s.headline, s.sub, s.content, path.basename(s.image ?? ""), s.link ?? "", s.notes ?? "", s.file].map(csvq).join(","));
  }
  process.stdout.write(lines.join("\n") + "\n");
} else if (flag("copy-cards")) {
  const week = opt("week") ?? sast();
  const dest = path.join(MIRROR, `Week of ${week}`);
  fs.mkdirSync(dest, { recursive: true });
  let n = 0;
  for (const s of weekFiles(week)) { if (s.image && fs.existsSync(path.join(ROOT, s.image))) { fs.copyFileSync(path.join(ROOT, s.image), path.join(dest, path.basename(s.image))); n++; } }
  console.log(`copied ${n} card(s) → ${dest}`);
} else if (opt("apply")) {
  const raw = fs.readFileSync(opt("apply"), "utf8");
  let rows = raw.trimStart().startsWith("|") ? parseMdTable(raw) : parseCsv(raw);
  const hi = rows.findIndex((r) => r.includes("Date") && r.includes("Spec"));
  if (hi < 0) { console.error("no header row with Date…Spec found"); process.exit(1); }
  rows = rows.slice(hi);
  const head = rows[0].map((h) => h.trim());
  const idx = Object.fromEntries(COLS.map((c) => [c, head.indexOf(c)]));
  let changed = 0;
  for (const r of rows.slice(1)) {
    const file = r[idx.Spec]?.trim(); if (!file) continue;
    const p = path.join(QUEUE, file); if (!fs.existsSync(p)) { console.log(`skip ${file}: no such spec`); continue; }
    const s = JSON.parse(fs.readFileSync(p, "utf8"));
    const st = (r[idx.Status] ?? "").trim().toLowerCase();
    const status = st.startsWith("approv") ? "approved" : st.startsWith("veto") ? "vetoed" : st.startsWith("publish") ? "published" : "draft";
    const headline = norm(r[idx.Headline]) && norm(r[idx.Headline]) !== norm(s.headline) ? r[idx.Headline].trim() : s.headline;
    const sub = r[idx.Sub] !== undefined && norm(r[idx.Sub]) !== norm(s.sub) ? r[idx.Sub].trim() : s.sub;
    const content = norm(r[idx.Caption]) && norm(r[idx.Caption]) !== norm(s.content) ? restoreParas(r[idx.Caption]) : s.content;
    const rerender = headline !== s.headline || sub !== s.sub;
    if (status !== s.status || rerender || content !== s.content) {
      Object.assign(s, { status, headline, sub, content });
      if (rerender && s.image) {
        execFileSync("python3", ["scripts/marketing-card.py", "--headline", headline, "--sub", sub, "--out", s.image, "--size", s.image.includes("square") ? "square" : "portrait"], { cwd: ROOT, stdio: "inherit" });
      }
      fs.writeFileSync(p, JSON.stringify(s, null, 2));
      changed++; console.log(`${file}: status=${status}${rerender ? " (card re-rendered)" : ""}`);
    }
  }
  console.log(`${changed} spec(s) updated`);
} else if (flag("today")) {
  const today = sast();
  const s = specs().find((x) => x.file.startsWith(today));
  console.log(s ? `${s.file} status=${s.status} when=${s.when}` : `no spec for ${today}`);
} else {
  console.log("Usage: --csv [--week YYYY-MM-DD] | --copy-cards [--week …] | --apply board.csv | --today");
}
