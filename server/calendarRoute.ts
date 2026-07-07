import type { Express, Request, Response } from "express";

/**
 * GET /api/calendar/visit.ics — serves a calendar event for a planned visit.
 *
 * Why a server route: blob-URL downloads don't work inside the native app's
 * webview (Capacitor). The client opens this URL in the system browser
 * instead, and iOS/Android hand the .ics straight to the calendar app.
 *
 * No auth on purpose: the URL only ever contains data the tapping user just
 * saw on their own screen (gran's first name + a date) — no IDs, no PII beyond
 * that, nothing enumerable.
 */
export function registerCalendarRoutes(app: Express) {
  app.get("/api/calendar/visit.ics", (req: Request, res: Response) => {
    const granName = String(req.query.gran ?? "Gran").slice(0, 80).replace(/[\r\n]/g, " ");
    const startParam = String(req.query.start ?? "");
    const start = new Date(startParam);
    if (isNaN(start.getTime())) {
      res.status(400).send("Invalid start date");
      return;
    }
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour

    const pad = (n: number) => String(n).padStart(2, "0");
    // Emit as UTC (Z) — the client passed an absolute instant.
    const fmt = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//GranWatch//EN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:granwatch-${start.getTime()}@granwatch.app`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:Visit ${granName}`,
      `DESCRIPTION:Scheduled visit to ${granName} via GranWatch`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="granwatch-visit.ics"');
    res.send(ics);
  });
}
