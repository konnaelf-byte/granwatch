# QUEUE — one JSON spec per post

File name: `YYYY-MM-DD-<slug>.json` (the date is the publish day, SAST). Card image lives in `../media/YYYY-MM-DD-<slug>.png`.

```json
{
  "status": "draft",                  // draft → approved → published | vetoed
  "slot": "wed-badge",                // rotation slot from ENGINE.md §6
  "content": "…post text…",           // ≤ 2,200 chars for IG; first 125 chars carry the hook
  "image": "Marketing Engine/media/2026-09-10-badge.png",
  "channels": ["facebook", "instagram"],
  "when": "2026-09-10T10:00:00Z",     // 12:00 SAST
  "link": "https://granwatch.app/learn", // Facebook link attachment; omit for IG-only
  "notes": "why this post / what to watch"
}
```

Approval happens on the weekly Google Sheet in Drive ("Engine — For approval") — Konna or Chantal set Status = Approved; `scripts/marketing-sheet.mjs --apply` copies that into `status`. The Publisher publishes only `approved` specs (in `silent`/`auto` mode, anything not vetoed). Published specs stay here for 90 days as the record, then move to `../ARCHIVE/`.
