import { describe, it, expect } from "vitest";

describe("Lemon Squeezy API Credentials", () => {
  it("should have valid LEMONSQUEEZY_API_KEY environment variable", () => {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).toMatch(/^eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9/); // JWT format
  });

  it("should have valid LEMONSQUEEZY_WEBHOOK_SECRET environment variable", () => {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    expect(secret).toBeDefined();
    expect(secret).toMatch(/^whsk_/); // Lemon Squeezy secret format
    expect(secret!.length).toBeLessThanOrEqual(40); // Max 40 characters
  });

  it("should be able to construct a valid Authorization header", () => {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    expect(apiKey).toBeDefined();
    const authHeader = `Bearer ${apiKey}`;
    expect(authHeader).toContain("Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9");
  });
});
