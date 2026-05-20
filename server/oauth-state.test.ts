import { describe, it, expect } from "vitest";

// Test the state encoding/decoding logic used in OAuth flow
describe("OAuth state encoding", () => {
  it("encodes a simple redirectUri (legacy format)", () => {
    const redirectUri = "https://granwatch.com/api/oauth/callback";
    const state = Buffer.from(redirectUri).toString("base64");
    const decoded = Buffer.from(state, "base64").toString();
    expect(decoded).toBe(redirectUri);
    // Not JSON, so no returnPath
    expect(decoded.startsWith("{")).toBe(false);
  });

  it("encodes redirectUri + returnPath as JSON (new format)", () => {
    const redirectUri = "https://granwatch.com/api/oauth/callback";
    const returnPath = "/join/ABCD1234";
    const statePayload = JSON.stringify({ redirectUri, returnPath });
    const state = Buffer.from(statePayload).toString("base64");

    const decoded = Buffer.from(state, "base64").toString();
    expect(decoded.startsWith("{")).toBe(true);
    const parsed = JSON.parse(decoded);
    expect(parsed.redirectUri).toBe(redirectUri);
    expect(parsed.returnPath).toBe("/join/ABCD1234");
  });

  it("parses returnPath correctly from state in callback handler logic", () => {
    const redirectUri = "https://granwatch.com/api/oauth/callback";
    const returnPath = "/join/XYZ99999";
    const statePayload = JSON.stringify({ redirectUri, returnPath });
    const state = Buffer.from(statePayload).toString("base64");

    // Simulate the callback handler logic
    let redirectTo = "/";
    try {
      const decoded = Buffer.from(state, "base64").toString();
      if (decoded.startsWith("{")) {
        const parsed = JSON.parse(decoded);
        if (parsed.returnPath) redirectTo = parsed.returnPath;
      }
    } catch { /* fallback to / */ }

    expect(redirectTo).toBe("/join/XYZ99999");
  });

  it("falls back to / for legacy state format (plain redirectUri)", () => {
    const redirectUri = "https://granwatch.com/api/oauth/callback";
    const state = Buffer.from(redirectUri).toString("base64");

    let redirectTo = "/";
    try {
      const decoded = Buffer.from(state, "base64").toString();
      if (decoded.startsWith("{")) {
        const parsed = JSON.parse(decoded);
        if (parsed.returnPath) redirectTo = parsed.returnPath;
      }
    } catch { /* fallback to / */ }

    expect(redirectTo).toBe("/");
  });

  it("falls back to / for malformed state", () => {
    const state = "not-valid-base64!!!";

    let redirectTo = "/";
    try {
      const decoded = Buffer.from(state, "base64").toString();
      if (decoded.startsWith("{")) {
        const parsed = JSON.parse(decoded);
        if (parsed.returnPath) redirectTo = parsed.returnPath;
      }
    } catch { /* fallback to / */ }

    expect(redirectTo).toBe("/");
  });
});
