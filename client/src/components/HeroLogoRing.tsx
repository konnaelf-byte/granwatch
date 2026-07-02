/**
 * HeroLogoRing — the landing-page hero where the GranWatch logo "comes alive".
 *
 * The animated status ring is drawn DIRECTLY ON the logo artwork's baked
 * bezel radius (not outside it):
 *  - a dark translucent TRACK dims the baked green bezel where the ring has
 *    "drained" (the tick marks ghost through — it reads as the logo's own
 *    ring going dark), and
 *  - the status-coloured arc glows on top where time remains.
 *
 * Loop (~8s): full green "Visited today!" → fast-forward, ring drains and
 * shifts green→yellow→orange while the day counter climbs to 14 ("OVERDUE")
 * → hold the tension → ✓ visit logged, snap back to full green → repeat.
 *
 * Respects prefers-reduced-motion (renders the static overdue frame).
 */

import { useEffect, useRef, useState } from "react";

// Bezel-free hero artwork (dark green, no baked ring) — the animated ring is
// the ONLY ring. The official logo (icon-1024.png) is untouched elsewhere.
const LOGO = "/hero-gran.jpg";
const THRESHOLD = 21; // days → matches the app default
const OVERDUE_DAY = 14; // where the fast-forward stops

// Ring geometry on the circular crop: radius as a fraction of the image
// radius, stroke width likewise. Slim + elegant now that nothing competes.
const BEZEL_RADIUS_FRACTION = 0.88;
const BEZEL_WIDTH_FRACTION = 0.11;

type Status = "green" | "yellow" | "orange";

const COLORS: Record<Status, { stroke: string; glow: string; label: string }> = {
  green:  { stroke: "#22c55e", glow: "drop-shadow(0 0 10px rgba(34,197,94,0.55))",  label: "All good" },
  yellow: { stroke: "#eab308", glow: "drop-shadow(0 0 12px rgba(234,179,8,0.55))",  label: "Due soon" },
  orange: { stroke: "#f97316", glow: "drop-shadow(0 0 14px rgba(249,115,22,0.65))", label: "Overdue" },
};

function statusForDay(day: number): Status {
  const pct = day / THRESHOLD;
  if (pct < 0.33) return "green";
  if (pct < 0.66) return "yellow";
  return "orange";
}

export function HeroLogoRing({ size = 220 }: { size?: number }) {
  const [day, setDay] = useState(0);
  const [justVisited, setJustVisited] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced) {
      setDay(OVERDUE_DAY); // static, honest frame
      return;
    }

    let cancelled = false;
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => { if (!cancelled) fn(); }, ms);
      timers.current.push(id);
    };

    const runLoop = () => {
      // 1. Fresh visit — full green (hold 1.6s)
      setJustVisited(false);
      setDay(0);
      later(() => {
        // 2. Fast-forward: 0 → 14 days over ~3.5s
        let d = 0;
        const tick = window.setInterval(() => {
          if (cancelled) { window.clearInterval(tick); return; }
          d += 1;
          setDay(d);
          if (d >= OVERDUE_DAY) {
            window.clearInterval(tick);
            // 3. Hold the OVERDUE moment (2.2s), then a visit saves the day
            later(() => {
              setJustVisited(true);
              setDay(0);
              // 4. Bask in the green (2s), then loop
              later(runLoop, 2000);
            }, 2200);
          }
        }, 250);
        timers.current.push(tick as unknown as number);
      }, 1600);
    };

    runLoop();
    return () => {
      cancelled = true;
      timers.current.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
      timers.current = [];
    };
  }, []);

  const status = statusForDay(day);
  const colors = COLORS[status];

  // Geometry — ring sits ON the artwork's bezel.
  const center = size / 2;
  const imgRadius = size / 2;
  const radius = imgRadius * BEZEL_RADIUS_FRACTION;
  const strokeWidth = imgRadius * BEZEL_WIDTH_FRACTION;
  const circumference = 2 * Math.PI * radius;
  const fillRatio = Math.max(0, 1 - Math.min(day, THRESHOLD) / THRESHOLD);
  const strokeDashoffset = circumference * (1 - fillRatio);

  const daysText = day === 0
    ? (justVisited ? "✓ Visited today!" : "Visited today!")
    : day === 1 ? "1 day ago" : `${day} days ago`;

  return (
    <div className="flex flex-col items-center gap-3" role="img"
      aria-label={`GranWatch status ring demo — the ring drains from green to orange as days pass, then resets when Gran gets a visit.`}>
      <div className="relative" aria-hidden="true" style={{ width: size, height: size }}>
        {/* The logo artwork — untouched */}
        <img src={LOGO} alt="" width={size} height={size}
          style={{ borderRadius: "50%", display: "block" }} />

        {/* Ring overlay ON the bezel — starts at top */}
        <svg width={size} height={size} className="absolute inset-0"
          style={{ transform: "rotate(-90deg)" }}>
          {/* Track: a constant faint groove, full circle — the coloured arc
              lives on top of it */}
          <circle cx={center} cy={center} r={radius} fill="none"
            stroke="rgba(255, 255, 255, 0.14)"
            strokeWidth={strokeWidth}
          />
          {/* Living arc — the status colour, glowing */}
          <circle cx={center} cy={center} r={radius} fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              opacity: 0.92,
              filter: colors.glow,
              transition: justVisited
                ? "stroke-dashoffset 0.5s ease-out, stroke 0.5s ease-out"
                : "stroke-dashoffset 0.28s linear, stroke 0.6s ease",
            }}
          />
        </svg>
      </div>

      {/* Synced counter */}
      <div className="text-center">
        <div className="font-bold leading-tight"
          style={{ color: colors.stroke, fontSize: size * 0.12, transition: "color 0.6s ease" }}>
          {daysText}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 font-medium uppercase tracking-wide">
          {day === 0 ? "All good" : colors.label}
        </div>
      </div>
    </div>
  );
}

export default HeroLogoRing;
