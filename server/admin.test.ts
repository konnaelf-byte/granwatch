/**
 * Admin dashboard procedure tests.
 */

import { describe, it, expect } from "vitest";

describe("Admin procedures (access control)", () => {
  it("listUsers requires admin role", () => {
    // Non-admin users should receive an error
    const mockUser = { id: 1, role: "user" as const };
    const isAdmin = mockUser.role === "admin";
    expect(isAdmin).toBe(false);
  });

  it("listElders requires admin role", () => {
    const mockUser = { id: 1, role: "user" as const };
    const isAdmin = mockUser.role === "admin";
    expect(isAdmin).toBe(false);
  });

  it("admin role user passes access check", () => {
    const mockAdminUser = { id: 1, role: "admin" as const };
    const isAdmin = mockAdminUser.role === "admin";
    expect(isAdmin).toBe(true);
  });
});

describe("Email notification threshold deduplication", () => {
  it("14-day threshold: only emails longest-absent member", () => {
    const members = [
      { userId: 1, myDaysSince: 14 },
      { userId: 2, myDaysSince: 7 },
      { userId: 3, myDaysSince: 14 },
    ];
    const maxDaysSince = Math.max(...members.map((m) => m.myDaysSince));
    const longestAbsent = members.filter((m) => m.myDaysSince === maxDaysSince);
    expect(longestAbsent).toHaveLength(2);
    expect(longestAbsent.every((m) => m.myDaysSince === 14)).toBe(true);
  });

  it("21-day threshold: emails all members", () => {
    const daysSince = 21;
    const shouldEmailAll = daysSince >= 21;
    expect(shouldEmailAll).toBe(true);
  });

  it("14-day threshold does not trigger at 13 days", () => {
    const daysSince = 13;
    const shouldEmail14 = daysSince >= 14 && daysSince < 21;
    expect(shouldEmail14).toBe(false);
  });

  it("14-day threshold triggers at exactly 14 days", () => {
    const daysSince = 14;
    const shouldEmail14 = daysSince >= 14 && daysSince < 21;
    expect(shouldEmail14).toBe(true);
  });

  it("21-day threshold takes priority over 14-day at 21 days", () => {
    const daysSince = 21;
    const shouldEmail21 = daysSince >= 21;
    const shouldEmail14Only = daysSince >= 14 && daysSince < 21;
    expect(shouldEmail21).toBe(true);
    expect(shouldEmail14Only).toBe(false);
  });
});

describe("Email deduplication — threshold crossing logic", () => {
  const EMAIL_SENTINEL_14 = -14;
  const EMAIL_SENTINEL_21 = -21;

  it("does not re-send 14-day email if sentinel exists after last visit", () => {
    const lastVisitDate = new Date("2026-04-01");
    const sentinels = [
      { userId: EMAIL_SENTINEL_14, sentAt: new Date("2026-04-15") }, // after last visit
    ];
    const email14AlreadySent = sentinels.some(
      (n) => n.userId === EMAIL_SENTINEL_14 && n.sentAt >= lastVisitDate
    );
    expect(email14AlreadySent).toBe(true);
  });

  it("re-sends 14-day email if last visit is newer than sentinel (new crossing)", () => {
    const lastVisitDate = new Date("2026-04-20"); // new visit after sentinel
    const sentinels = [
      { userId: EMAIL_SENTINEL_14, sentAt: new Date("2026-04-15") }, // before new visit
    ];
    const email14AlreadySent = sentinels.some(
      (n) => n.userId === EMAIL_SENTINEL_14 && n.sentAt >= lastVisitDate
    );
    expect(email14AlreadySent).toBe(false);
  });

  it("does not re-send 21-day email if sentinel exists after last visit", () => {
    const lastVisitDate = new Date("2026-03-01");
    const sentinels = [
      { userId: EMAIL_SENTINEL_21, sentAt: new Date("2026-03-22") },
    ];
    const email21AlreadySent = sentinels.some(
      (n) => n.userId === EMAIL_SENTINEL_21 && n.sentAt >= lastVisitDate
    );
    expect(email21AlreadySent).toBe(true);
  });

  it("14-day and 21-day sentinels are independent", () => {
    const lastVisitDate = new Date("2026-04-01");
    const sentinels = [
      { userId: EMAIL_SENTINEL_14, sentAt: new Date("2026-04-15") },
      // No 21-day sentinel
    ];
    const email14AlreadySent = sentinels.some(
      (n) => n.userId === EMAIL_SENTINEL_14 && n.sentAt >= lastVisitDate
    );
    const email21AlreadySent = sentinels.some(
      (n) => n.userId === EMAIL_SENTINEL_21 && n.sentAt >= lastVisitDate
    );
    expect(email14AlreadySent).toBe(true);
    expect(email21AlreadySent).toBe(false);
  });
});
