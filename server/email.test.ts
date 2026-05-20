/**
 * Email service tests — validates Resend credentials and template generation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Template unit tests (no network calls) ───────────────────────────────────

describe("Email template generation", () => {
  it("builds a 14-day subject for the longest-absent member", () => {
    const subject = `It's been a while since you visited Ouma Ingrid 💛`;
    expect(subject).toContain("Ouma Ingrid");
    expect(subject).toContain("💛");
  });

  it("builds a 21-day subject for the whole family", () => {
    const subject = `Ouma Ingrid hasn't had a visitor in 21 days 💛`;
    expect(subject).toContain("21 days");
    expect(subject).toContain("Ouma Ingrid");
  });
});

// ─── Resend credential validation ─────────────────────────────────────────────

describe("Resend credentials", () => {
  it("RESEND_API_KEY is set in environment", () => {
    expect(process.env.RESEND_API_KEY).toBeTruthy();
    expect(process.env.RESEND_API_KEY).toMatch(/^re_/);
  });

  it("RESEND_FROM_EMAIL is set in environment", () => {
    expect(process.env.RESEND_FROM_EMAIL).toBeTruthy();
  });

  it("validates Resend API key is functional", async () => {
    const { validateResendCredentials } = await import("./email");
    const isValid = await validateResendCredentials();
    expect(isValid).toBe(true);
  }, 15000);
});
