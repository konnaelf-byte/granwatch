import { describe, it, expect } from "vitest";

// ─── Pure utility functions (extracted for testing) ───────────────────────────

// Calendar-day boundary version (matches routers.ts fix)
function daysSince(date: Date): number {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const visitMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = todayMidnight.getTime() - visitMidnight.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

function getStatus(daysSinceVisit: number, threshold: number): "green" | "yellow" | "orange" | "red" {
  const pct = daysSinceVisit / threshold;
  if (pct < 0.33) return "green";
  if (pct < 0.66) return "yellow";
  if (pct < 1) return "orange";
  return "red";
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function splitCost(totalCents: number, contributors: number): number {
  if (contributors <= 0) return totalCents;
  return Math.ceil(totalCents / contributors);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("daysSince", () => {
  it("returns 0 for today (any time of day)", () => {
    // A visit at 11:59pm tonight is still 0 days ago
    const lateTonight = new Date();
    lateTonight.setHours(23, 59, 59, 0);
    expect(daysSince(lateTonight)).toBe(0);

    // A visit at 00:01am today is also 0 days ago
    const earlyToday = new Date();
    earlyToday.setHours(0, 1, 0, 0);
    expect(daysSince(earlyToday)).toBe(0);
  });

  it("returns 1 for yesterday (regardless of time)", () => {
    // Yesterday at 11:59pm is 1 calendar day ago
    const yesterdayLate = new Date();
    yesterdayLate.setDate(yesterdayLate.getDate() - 1);
    yesterdayLate.setHours(23, 59, 0, 0);
    expect(daysSince(yesterdayLate)).toBe(1);

    // Yesterday at 00:01am is also 1 calendar day ago
    const yesterdayEarly = new Date();
    yesterdayEarly.setDate(yesterdayEarly.getDate() - 1);
    yesterdayEarly.setHours(0, 1, 0, 0);
    expect(daysSince(yesterdayEarly)).toBe(1);
  });

  it("returns 7 for exactly 7 calendar days ago", () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    expect(daysSince(weekAgo)).toBe(7);
  });

  it("returns 21 for 3 weeks ago", () => {
    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    expect(daysSince(threeWeeksAgo)).toBe(21);
  });

  it("never returns negative values for future dates", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(daysSince(tomorrow)).toBe(0);
  });
});

describe("getStatus", () => {
  const threshold = 21;

  it("returns green for recent visits (< 33% of threshold)", () => {
    expect(getStatus(3, threshold)).toBe("green");   // 14% — green
    expect(getStatus(6, threshold)).toBe("green");   // 28% — green
  });

  it("returns yellow for moderate absence (33–66%)", () => {
    expect(getStatus(8, threshold)).toBe("yellow");  // 38%
    expect(getStatus(12, threshold)).toBe("yellow"); // 57%
  });

  it("returns orange for high absence (66–100%)", () => {
    expect(getStatus(15, threshold)).toBe("orange"); // 71%
    expect(getStatus(20, threshold)).toBe("orange"); // 95%
  });

  it("returns red at or beyond threshold", () => {
    expect(getStatus(21, threshold)).toBe("red");    // 100%
    expect(getStatus(30, threshold)).toBe("red");    // 143%
    expect(getStatus(999, threshold)).toBe("red");   // never visited
  });

  it("respects custom threshold", () => {
    expect(getStatus(5, 7)).toBe("orange");   // 71% of 7-day threshold
    expect(getStatus(7, 7)).toBe("red");      // exactly at 30-day threshold
    expect(getStatus(9, 30)).toBe("green");   // 30% of 30-day threshold
    expect(getStatus(10, 30)).toBe("yellow"); // 33.3% of 30-day threshold → yellow
  });
});

describe("generateInviteCode", () => {
  it("generates an 8-character uppercase code", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(8);
    expect(code).toBe(code.toUpperCase());
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, generateInviteCode));
    expect(codes.size).toBeGreaterThan(95); // very unlikely to collide
  });
});

describe("splitCost", () => {
  const MONTHLY_COST = 2700; // R27.00 in cents

  it("returns full cost with 1 contributor", () => {
    expect(splitCost(MONTHLY_COST, 1)).toBe(2700);
  });

  it("splits evenly with 9 contributors (R3 each)", () => {
    expect(splitCost(MONTHLY_COST, 9)).toBe(300); // R3.00
  });

  it("rounds up for uneven splits", () => {
    // 2700 / 4 = 675 (exact)
    expect(splitCost(MONTHLY_COST, 4)).toBe(675);
    // 2700 / 7 = 385.7 → ceil = 386
    expect(splitCost(MONTHLY_COST, 7)).toBe(386);
  });

  it("handles 0 contributors gracefully", () => {
    expect(splitCost(MONTHLY_COST, 0)).toBe(MONTHLY_COST);
  });
});
